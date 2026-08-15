import { FRAMEBUFFER_ADDRESS, FRAMEBUFFER_HEIGHT, FRAMEBUFFER_WIDTH } from './memory.js'
import { ADD, assemble, CMP, JE, JMP, JNE, LOAD16, MOV, NOP, R0, R1, R2, STORE, STORE16, STORE_AT, SYSCALL } from './asm.js'
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

    Because our scheduler now gives 28 instructions
    per time slice, add NOP instructions so this
    animation does not suddenly become extremely fast.
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

    Rows 0–4 are left available for HELLO and /bin/animate.

    Snake owns rows 5–24.

    That gives us:

        20 rows × 80 columns = 1600 cells

    Food can appear randomly at ANY of those 1600 cells.

    The snake continuously walks through all 1600 cells,
    so every food location is eventually reachable.
*/

const SNAKE_TOP_ROW = 5
const SNAKE_LENGTH = 5

const SNAKE_GAME_HEIGHT = FRAMEBUFFER_HEIGHT - SNAKE_TOP_ROW
const SNAKE_GAME_SIZE = FRAMEBUFFER_WIDTH * SNAKE_GAME_HEIGHT

const snakeScreenStart = FRAMEBUFFER_ADDRESS + FRAMEBUFFER_WIDTH * SNAKE_TOP_ROW

/*
    Snake's private RAM.

    These values need 16 bits because they can contain
    positions from 0–1599.

    0–1 = head
    2–3 = tail
    4–5 = food
*/
const HEAD = 0
const TAIL = 2
const FOOD = 4

/*
    Since every instruction is exactly four bytes,
    these values are byte offsets inside the program.

    They behave like tiny assembly labels.
*/
const SNAKE_LOOP = 18 * 4
const HEAD_READY = 25 * 4
const TAIL_READY = 41 * 4
const FOOD_EATEN = 48 * 4

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
    */
    MOV(R0, SNAKE_LENGTH - 1),
    STORE16(R0, HEAD),

    MOV(R0, 0),
    STORE16(R0, TAIL),

    /*
        Ask the kernel for a completely random cell
        anywhere inside Snake's 1600-cell playfield.
    */
    MOV(R0, SNAKE_GAME_SIZE),
    SYSCALL(syscallNumber.RANDOM),
    STORE16(R0, FOOD),

    /*
        Draw food.
    */
    MOV(R1, snakeScreenStart),
    ADD(R1, R0),

    MOV(R2, 42),
    STORE_AT(R2, R1),

    NOP(),

    /*
        ========================================
        MAIN LOOP
        ========================================
    */

    /*
        head++
    */
    LOAD16(R0, HEAD),

    MOV(R1, 1),
    ADD(R0, R1),

    /*
        Wrap after the last cell.

        1599 → 0
    */
    MOV(R1, SNAKE_GAME_SIZE),
    CMP(R0, R1),
    JNE(HEAD_READY),

    MOV(R0, 0),

    /*
        Save new head.
    */
    STORE16(R0, HEAD),

    /*
        Did the head land on food?
    */
    LOAD16(R1, FOOD),
    CMP(R0, R1),
    JE(FOOD_EATEN),

    /*
        ========================================
        NORMAL MOVEMENT
        ========================================

        Erase tail.
    */
    LOAD16(R0, TAIL),

    MOV(R1, snakeScreenStart),
    ADD(R1, R0),

    MOV(R2, 32),
    STORE_AT(R2, R1),

    /*
        tail++
    */
    LOAD16(R0, TAIL),

    MOV(R1, 1),
    ADD(R0, R1),

    MOV(R1, SNAKE_GAME_SIZE),
    CMP(R0, R1),
    JNE(TAIL_READY),

    MOV(R0, 0),

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

        Draw the new head.

        We deliberately DO NOT move the tail.

        Therefore the snake becomes one cell longer.
    */
    LOAD16(R0, HEAD),

    MOV(R1, snakeScreenStart),
    ADD(R1, R0),

    MOV(R2, 35),
    STORE_AT(R2, R1),

    /*
        Generate another random food position.
    */
    MOV(R0, SNAKE_GAME_SIZE),
    SYSCALL(syscallNumber.RANDOM),
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
