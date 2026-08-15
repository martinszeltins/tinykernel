import { opcode } from './instructions.js'

export const R0 = 0
export const R1 = 1
export const R2 = 2
export const R3 = 3

/*
    Convert a 16-bit number into two bytes.

    Example:

    1000 → [232, 3]

    because:

    232 + (3 × 256) = 1000
*/
const word = value => [
    value & 0xff,
    (value >> 8) & 0xff,
]

export const MOV = (register, value) => {
    return [
        opcode.MOV,
        register,
        ...word(value),
    ]
}

export const LOAD = (register, offset) => {
    return [
        opcode.LOAD,
        register,
        ...word(offset),
    ]
}

export const STORE = (register, offset) => {
    return [
        opcode.STORE,
        register,
        ...word(offset),
    ]
}

export const ADD = (registerA, registerB) => {
    return [
        opcode.ADD,
        registerA,
        registerB,
        0,
    ]
}

export const SUB = (registerA, registerB) => {
    return [
        opcode.SUB,
        registerA,
        registerB,
        0,
    ]
}

export const CMP = (registerA, registerB) => {
    return [
        opcode.CMP,
        registerA,
        registerB,
        0,
    ]
}

export const JMP = target => {
    const [low, high] = word(target)

    return [
        opcode.JMP,
        low,
        high,
        0,
    ]
}

export const JE = target => {
    const [low, high] = word(target)

    return [
        opcode.JE,
        low,
        high,
        0,
    ]
}

export const JNE = target => {
    const [low, high] = word(target)

    return [
        opcode.JNE,
        low,
        high,
        0,
    ]
}

export const SYSCALL = number => {
    const [low, high] = word(number)

    return [
        opcode.SYSCALL,
        low,
        high,
        0,
    ]
}

export const HALT = () => {
    return [
        opcode.HALT,
        0,
        0,
        0,
    ]
}

/*
    Take our readable instructions and turn them
    into the actual sequence of machine-code bytes.
*/
export const assemble = (...instructions) => {
    return new Uint8Array(instructions.flat())
}
