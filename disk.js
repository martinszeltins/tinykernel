import { FRAMEBUFFER_ADDRESS, FRAMEBUFFER_WIDTH } from './memory.js'
import { assemble, JMP, MOV, R0, R1, R2, STORE } from './asm.js'

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
    MOV(R0, 72),                        // H
    STORE(R0, FRAMEBUFFER_ADDRESS),

    MOV(R0, 69),                        // E
    STORE(R0, FRAMEBUFFER_ADDRESS + 1),

    MOV(R0, 76),                        // L
    STORE(R0, FRAMEBUFFER_ADDRESS + 2),

    MOV(R0, 76),                        // L
    STORE(R0, FRAMEBUFFER_ADDRESS + 3),

    MOV(R0, 79),                        // O
    STORE(R0, FRAMEBUFFER_ADDRESS + 4),

    JMP(40)
)

/*
    /bin/animate

    Move "*" five positions to the right,
    then five positions back to the left,
    forever.

    R0 = space
    R1 = *
*/

const ANIMATION_ROW = 2
const animationStartAddress = FRAMEBUFFER_ADDRESS + FRAMEBUFFER_WIDTH * ANIMATION_ROW

const animationInstructions = [
    MOV(R0, 32),                        // space
    MOV(R1, 42),                        // *
    STORE(R1, animationStartAddress),   // draw initial *
    MOV(R2, 0),                         // keep timing aligned
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

    A five-character snake moves continuously
    from left to right.

    When it reaches the right edge of the screen,
    it wraps around to the left.

    R0 = space
    R1 = snake body "#"
*/

const SNAKE_ROW = 5
const SNAKE_LENGTH = 5
const snakeStartAddress = FRAMEBUFFER_ADDRESS + FRAMEBUFFER_WIDTH * SNAKE_ROW

const snakeInstructions = [
    MOV(R0, 32),                    // space
    MOV(R1, 35),                    // #

    STORE(R1, snakeStartAddress),
    STORE(R1, snakeStartAddress + 1),
    STORE(R1, snakeStartAddress + 2),
    STORE(R1, snakeStartAddress + 3),
    STORE(R1, snakeStartAddress + 4),

    /*
        Padding instruction so the movement loop
        starts aligned with our 2-instruction time slice.
    */
    MOV(R2, 0),
]

/*
    8 instructions × 4 bytes = byte 32
*/
const SNAKE_LOOP = 32

/*
    Every movement consists of exactly two instructions:

        erase tail
        draw new head

    Because TIME_SLICE = 2, the snake moves
    exactly once per scheduler tick.
*/
for (let position = 0; position < FRAMEBUFFER_WIDTH; position++) {
    const tail = position
    const head = (position + SNAKE_LENGTH) % FRAMEBUFFER_WIDTH

    snakeInstructions.push(
        STORE(R0, snakeStartAddress + tail),
        STORE(R1, snakeStartAddress + head)
    )
}

/*
    After 80 movements the snake is back at its
    original position, so repeat forever.
*/
snakeInstructions.push(
    MOV(R2, 0),
    JMP(SNAKE_LOOP)
)

const snakeProgram = assemble(...snakeInstructions)

/*
    Physical file locations on disk.
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

const fileTableBytes = new TextEncoder().encode(
    JSON.stringify(fileTable)
)

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
