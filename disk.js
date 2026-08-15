import { FRAMEBUFFER_ADDRESS, FRAMEBUFFER_WIDTH } from './memory.js'
import { assemble, JMP, MOV, R0, R1, R2, STORE } from './asm.js'

/*
    DISK — 1 MiB

    0 ─────────────────────────────────────
        FILE TABLE

    1024 ──────────────────────────────────
        /sbin/init
        /bin/animate
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

const animationStartAddress =
    FRAMEBUFFER_ADDRESS +
    FRAMEBUFFER_WIDTH * ANIMATION_ROW

const animationInstructions = [
    MOV(R0, 32),                        // space
    MOV(R1, 42),                        // *
    STORE(R1, animationStartAddress),   // draw initial *
    MOV(R2, 0),                         // keeps timing aligned
]

/*
    The animation loop starts after the first
    four instructions.

    4 instructions × 4 bytes = byte 16
*/
const ANIMATION_LOOP = 16

/*
    Move five positions to the right.
*/
for (let position = 1; position <= 5; position++) {
    animationInstructions.push(
        STORE(
            R0,
            animationStartAddress + position - 1
        ),
        STORE(
            R1,
            animationStartAddress + position
        )
    )
}

/*
    Move five positions back to the left.
*/
for (let position = 4; position >= 0; position--) {
    animationInstructions.push(
        STORE(
            R0,
            animationStartAddress + position + 1
        ),
        STORE(
            R1,
            animationStartAddress + position
        )
    )
}

/*
    Keep the JMP aligned with our two-instruction
    scheduler time slice.

    Then go back to the beginning of the movement loop.
*/
animationInstructions.push(
    MOV(R2, 0),
    JMP(ANIMATION_LOOP)
)

const animationProgram = assemble(
    ...animationInstructions
)

const INIT_START = 1024

const ANIMATION_START =
    INIT_START +
    initProgram.length

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
]

const fileTableBytes = new TextEncoder().encode(
    JSON.stringify(fileTable)
)

bytes.set(fileTableBytes, 0)
bytes.set(initProgram, INIT_START)
bytes.set(animationProgram, ANIMATION_START)

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
