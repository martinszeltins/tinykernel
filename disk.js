import { FRAMEBUFFER_ADDRESS } from './memory.js'
import { assemble, JMP, MOV, R0, STORE } from './asm.js'

/*
    0 ─────────────────────────────────────
        FILE TABLE

    1024 ──────────────────────────────────
        /sbin/init machine code
*/

const bytes = new Uint8Array(1024 * 1024)

/*
    /sbin/init

    Write "HELLO" to the framebuffer.

    After that, jump to itself forever so that
    the init process stays alive.
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
        start: 1024,
        size: initProgram.length,
    },
]

const fileTableBytes = new TextEncoder().encode(
    JSON.stringify(fileTable)
)

bytes.set(fileTableBytes, 0)
bytes.set(initProgram, 1024)

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
