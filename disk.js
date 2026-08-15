import { FRAMEBUFFER_ADDRESS, FRAMEBUFFER_HEIGHT, FRAMEBUFFER_WIDTH } from './memory.js'
import { ADD, assemble, CMP, JE, JMP, JNE, LOAD16, MOD, MOV, NOP, R0, R1, R2, STORE, STORE16, STORE_AT, SUB, SYSCALL } from './asm.js'
import { syscallNumber } from './syscall.js'

/*
    DISK — 1 MiB

    0 ─────────────────────────────────────
        FILE TABLE

    1024 ──────────────────────────────────
        /sbin/init
        /bin/animate
        /games/snake
*/

const bytes = new Uint8Array(1024 * 1024)

/*
    /sbin/init
*/

const initProgram = assemble(
    MOV(R0, 72),
    STORE(R0, FRAMEBUFFER_ADDRESS),

    MOV(R0, 69),
    STORE(R0, FRAMEBUFFER_ADDRESS + 1),

    MOV(R0, 76),
    STORE(R0, FRAMEBUFFER_ADDRESS + 2),

    MOV(R0, 76),
    STORE(R0, FRAMEBUFFER_ADDRESS + 3),

    MOV(R0, 79),
    STORE(R0, FRAMEBUFFER_ADDRESS + 4),

    JMP(40)
)

/*
    /bin/animate
*/

const ANIMATION_ROW = 2
const animationStartAddress = FRAMEBUFFER_ADDRESS + FRAMEBUFFER_WIDTH * ANIMATION_ROW

const animationInstructions = [
    MOV(R0, 32),
    MOV(R1, 42),
    STORE(R1, animationStartAddress),
]

const addAnimationStep = (oldPosition, newPosition) => {
    animationInstructions.push(
        STORE(R0, animationStartAddress + oldPosition),
        STORE(R1, animationStartAddress + newPosition)
    )

    for (let i = 0; i < 26; i++) {
        animationInstructions.push(NOP())
    }
}

const ANIMATION_LOOP = animationInstructions.length * 4

for (let position = 0; position < 5; position++) {
    addAnimationStep(position, position + 1)
}

for (let position = 5; position > 0; position--) {
    addAnimationStep(position, position - 1)
}

animationInstructions.push(
    JMP(ANIMATION_LOOP)
)

const animationProgram = assemble(...animationInstructions)

/*
    /games/snake

    Snake owns rows 5–24.

    This gives it:

        20 × 80 = 1600 cells

    The snake travels through those cells in one
    continuous circular path.

    Private process memory:

        0–1    head
        2–3    tail
        4–5    food
        6–7    length
*/

const SNAKE_TOP_ROW = 5
const SNAKE_LENGTH = 5

const SNAKE_GAME_HEIGHT = FRAMEBUFFER_HEIGHT - SNAKE_TOP_ROW
const SNAKE_GAME_SIZE = FRAMEBUFFER_WIDTH * SNAKE_GAME_HEIGHT

const snakeScreenStart = FRAMEBUFFER_ADDRESS + FRAMEBUFFER_WIDTH * SNAKE_TOP_ROW

const HEAD = 0
const TAIL = 2
const FOOD = 4
const LENGTH = 6

/*
    Every instruction is 4 bytes.

    Main loop starts at instruction 27.
    Food-eaten handler starts at instruction 53.
*/
const SNAKE_LOOP = 27 * 4
const FOOD_EATEN = 53 * 4

const snakeProgram = assemble(
    /*
        Initial snake:

        #####
    */
    MOV(R0, 35),
    STORE(R0, snakeScreenStart),
    STORE(R0, snakeScreenStart + 1),
    STORE(R0, snakeScreenStart + 2),
    STORE(R0, snakeScreenStart + 3),
    STORE(R0, snakeScreenStart + 4),

    /*
        head = 4
        tail = 0
        length = 5
    */
    MOV(R0, SNAKE_LENGTH - 1),
    STORE16(R0, HEAD),

    MOV(R0, 0),
    STORE16(R0, TAIL),

    MOV(R0, SNAKE_LENGTH),
    STORE16(R0, LENGTH),

    /*
        Generate initial food.

        freeCells = GAME_SIZE - length

        random gives:
            0 .. freeCells - 1

        Add 1 so the food is always at least
        one cell ahead of the head.

        food =
            (head + randomDistance) % GAME_SIZE

        Because the snake body occupies the cells
        behind the head, this guarantees that the
        food cannot spawn inside the snake.
    */
    MOV(R0, SNAKE_GAME_SIZE),
    LOAD16(R1, LENGTH),
    SUB(R0, R1),

    SYSCALL(syscallNumber.RANDOM),

    MOV(R1, 1),
    ADD(R0, R1),

    LOAD16(R1, HEAD),
    ADD(R0, R1),

    MOV(R1, SNAKE_GAME_SIZE),
    MOD(R0, R1),

    STORE16(R0, FOOD),

    /*
        Draw food.
    */
    MOV(R1, snakeScreenStart),
    ADD(R1, R0),

    MOV(R2, 42),
    STORE_AT(R2, R1),

    /*
        ========================================
        MAIN LOOP
        ========================================
    */

    /*
        head =
            (head + 1) % GAME_SIZE
    */
    LOAD16(R0, HEAD),

    MOV(R1, 1),
    ADD(R0, R1),

    MOV(R1, SNAKE_GAME_SIZE),
    MOD(R0, R1),

    STORE16(R0, HEAD),

    /*
        Did we eat the food?
    */
    LOAD16(R1, FOOD),
    CMP(R0, R1),
    JE(FOOD_EATEN),

    /*
        ========================================
        NORMAL MOVEMENT

        Move the tail forward by one cell.
        ========================================
    */

    /*
        Erase current tail.
    */
    LOAD16(R0, TAIL),

    MOV(R1, snakeScreenStart),
    ADD(R1, R0),

    MOV(R2, 32),
    STORE_AT(R2, R1),

    /*
        tail =
            (tail + 1) % GAME_SIZE
    */
    LOAD16(R0, TAIL),

    MOV(R1, 1),
    ADD(R0, R1),

    MOV(R1, SNAKE_GAME_SIZE),
    MOD(R0, R1),

    STORE16(R0, TAIL),

    /*
        Draw new head.
    */
    LOAD16(R0, HEAD),

    MOV(R1, snakeScreenStart),
    ADD(R1, R0),

    MOV(R2, 35),
    STORE_AT(R2, R1),

    JMP(SNAKE_LOOP),

    /*
        ========================================
        FOOD EATEN
        ========================================

        IMPORTANT:

        We draw the new head but DO NOT move
        the tail.

        That physically makes the snake one cell
        longer on the framebuffer.
    */

    LOAD16(R0, HEAD),

    MOV(R1, snakeScreenStart),
    ADD(R1, R0),

    MOV(R2, 35),
    STORE_AT(R2, R1),

    /*
        length++
    */
    LOAD16(R0, LENGTH),

    MOV(R1, 1),
    ADD(R0, R1),

    STORE16(R0, LENGTH),

    /*
        If the snake somehow fills the entire
        playfield, don't try to spawn more food.
    */
    MOV(R1, SNAKE_GAME_SIZE),
    CMP(R0, R1),
    JE(SNAKE_LOOP),

    /*
        Generate NEW food somewhere in the
        remaining free part of the board.

        freeCells = GAME_SIZE - length
    */
    MOV(R0, SNAKE_GAME_SIZE),

    LOAD16(R1, LENGTH),
    SUB(R0, R1),

    /*
        RANDOM returns:
            0 .. freeCells - 1
    */
    SYSCALL(syscallNumber.RANDOM),

    /*
        Convert that into:
            1 .. freeCells
    */
    MOV(R1, 1),
    ADD(R0, R1),

    /*
        Start counting from the current head.
    */
    LOAD16(R1, HEAD),
    ADD(R0, R1),

    /*
        Wrap around the playfield.
    */
    MOV(R1, SNAKE_GAME_SIZE),
    MOD(R0, R1),

    STORE16(R0, FOOD),

    /*
        Draw new food.
    */
    MOV(R1, snakeScreenStart),
    ADD(R1, R0),

    MOV(R2, 42),
    STORE_AT(R2, R1),

    JMP(SNAKE_LOOP)
)

/*
    Physical files on disk.
*/

const INIT_START = 1024
const ANIMATION_START = INIT_START + initProgram.length
const SNAKE_START = ANIMATION_START + animationProgram.length

const fileTable = [
    {
        id: 1,
        parentDirID: 0,
        type: 'directory',
        name: 'sbin',
    },
    {
        id: 2,
        parentDirID: 1,
        type: 'file',
        name: 'init',
        start: INIT_START,
        size: initProgram.length,
    },
    {
        id: 3,
        parentDirID: 0,
        type: 'directory',
        name: 'bin',
    },
    {
        id: 4,
        parentDirID: 3,
        type: 'file',
        name: 'animate',
        start: ANIMATION_START,
        size: animationProgram.length,
    },
    {
        id: 5,
        parentDirID: 0,
        type: 'directory',
        name: 'games',
    },
    {
        id: 6,
        parentDirID: 5,
        type: 'file',
        name: 'snake',
        start: SNAKE_START,
        size: snakeProgram.length,
    },
]

const fileTableBytes = new TextEncoder().encode(JSON.stringify(fileTable))

bytes.set(fileTableBytes, 0)
bytes.set(initProgram, INIT_START)
bytes.set(animationProgram, ANIMATION_START)
bytes.set(snakeProgram, SNAKE_START)

const read = (start, size) => {
    return bytes.slice(start, start + size)
}

const write = (start, data) => {
    bytes.set(data, start)
}

export const disk = {
    read,
    write,
}
