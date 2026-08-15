import { FRAMEBUFFER_ADDRESS, FRAMEBUFFER_WIDTH } from './memory.js'
import { ADD, assemble, CMP, JE, JMP, JNE, LOAD, MOV, R0, R1, R2, STORE, STORE_AT, SYSCALL } from './asm.js'
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

    Write HELLO to the first row and stay alive.
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

    Move "*" five positions right and back forever.
*/

const ANIMATION_ROW = 2
const animationStartAddress = FRAMEBUFFER_ADDRESS + FRAMEBUFFER_WIDTH * ANIMATION_ROW

const animationInstructions = [
    MOV(R0, 32),
    MOV(R1, 42),
    STORE(R1, animationStartAddress),
    MOV(R2, 0),
]

const ANIMATION_LOOP = 16

for (let position = 1; position <= 5; position++) {
    animationInstructions.push(
        STORE(R0, animationStartAddress + position - 1),
        STORE(R1, animationStartAddress + position)
    )
}

for (let position = 4; position >= 0; position--) {
    animationInstructions.push(
        STORE(R0, animationStartAddress + position + 1),
        STORE(R1, animationStartAddress + position)
    )
}

animationInstructions.push(
    MOV(R2, 0),
    JMP(ANIMATION_LOOP)
)

const animationProgram = assemble(...animationInstructions)

/*
    /games/snake

    Snake starts five characters long.

    It moves continuously to the right and wraps
    around the screen.

    Food appears at a random position on the
    snake's row.

    When the head reaches the food:
        - the tail is NOT erased
        - the snake therefore grows by one
        - new random food is created

    Private process data:

        0 = head position
        1 = tail position
        2 = food position
*/

const SNAKE_ROW = 5
const SNAKE_LENGTH = 5

const HEAD = 0
const TAIL = 1
const FOOD = 2

const snakeRowStart = FRAMEBUFFER_ADDRESS + FRAMEBUFFER_WIDTH * SNAKE_ROW

/*
    Because every instruction is exactly 4 bytes,
    these are byte offsets into the Snake program.

    They are our tiny equivalent of assembly labels.
*/
const SNAKE_LOOP = 17 * 4
const HEAD_READY = 24 * 4
const TAIL_READY = 40 * 4
const FOOD_EATEN = 47 * 4

const snakeProgram = assemble(
    /*
        Draw initial five-character snake:

        #####
    */
    MOV(R0, 35),
    STORE(R0, snakeRowStart),
    STORE(R0, snakeRowStart + 1),
    STORE(R0, snakeRowStart + 2),
    STORE(R0, snakeRowStart + 3),
    STORE(R0, snakeRowStart + 4),

    /*
        head = 4
        tail = 0
    */
    MOV(R0, SNAKE_LENGTH - 1),
    STORE(R0, HEAD),

    MOV(R0, 0),
    STORE(R0, TAIL),

    /*
        Ask the kernel for a random column.

        R0 = 80
        SYSCALL RANDOM
        R0 = random value 0–79
    */
    MOV(R0, FRAMEBUFFER_WIDTH),
    SYSCALL(syscallNumber.RANDOM),
    STORE(R0, FOOD),

    /*
        Draw the initial food.

        R1 = framebuffer row start + random column
        R2 = "*"
    */
    MOV(R1, snakeRowStart),
    ADD(R1, R0),

    MOV(R2, 42),
    STORE_AT(R2, R1),

    /*
        ==============================
        MAIN SNAKE LOOP
        ==============================
    */

    /*
        head++
    */
    LOAD(R0, HEAD),
    MOV(R1, 1),
    ADD(R0, R1),

    /*
        Wrap:

        if head != 80
            continue

        head = 0
    */
    MOV(R1, FRAMEBUFFER_WIDTH),
    CMP(R0, R1),
    JNE(HEAD_READY),

    MOV(R0, 0),

    /*
        Save new head.
    */
    STORE(R0, HEAD),

    /*
        Did the new head reach the food?
    */
    LOAD(R1, FOOD),
    CMP(R0, R1),
    JE(FOOD_EATEN),

    /*
        ==============================
        NORMAL MOVEMENT
        ==============================

        Erase the old tail.
    */
    LOAD(R0, TAIL),

    MOV(R1, snakeRowStart),
    ADD(R1, R0),

    MOV(R2, 32),
    STORE_AT(R2, R1),

    /*
        tail++
    */
    LOAD(R0, TAIL),
    MOV(R1, 1),
    ADD(R0, R1),

    /*
        Wrap tail at screen edge.
    */
    MOV(R1, FRAMEBUFFER_WIDTH),
    CMP(R0, R1),
    JNE(TAIL_READY),

    MOV(R0, 0),

    STORE(R0, TAIL),

    /*
        Draw the new head.
    */
    LOAD(R0, HEAD),

    MOV(R1, snakeRowStart),
    ADD(R1, R0),

    MOV(R2, 35),
    STORE_AT(R2, R1),

    JMP(SNAKE_LOOP),

    /*
        ==============================
        FOOD EATEN
        ==============================

        Draw the new head, but DO NOT erase
        or advance the tail.

        That makes the snake one character longer.
    */
    LOAD(R0, HEAD),

    MOV(R1, snakeRowStart),
    ADD(R1, R0),

    MOV(R2, 35),
    STORE_AT(R2, R1),

    /*
        Ask kernel for another random food position.
    */
    MOV(R0, FRAMEBUFFER_WIDTH),
    SYSCALL(syscallNumber.RANDOM),
    STORE(R0, FOOD),

    /*
        Draw the new food.
    */
    MOV(R1, snakeRowStart),
    ADD(R1, R0),

    MOV(R2, 42),
    STORE_AT(R2, R1),

    JMP(SNAKE_LOOP)
)

/*
    Physical locations of files on disk.
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
