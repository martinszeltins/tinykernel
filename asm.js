import { opcode } from './instructions.js'

export const R0 = 0
export const R1 = 1
export const R2 = 2
export const R3 = 3

const word = value => [
    value & 0xff,
    (value >> 8) & 0xff,
]

export const MOV = (register, value) => [
    opcode.MOV,
    register,
    ...word(value),
]

export const LOAD = (register, offset) => [
    opcode.LOAD,
    register,
    ...word(offset),
]

export const STORE = (register, offset) => [
    opcode.STORE,
    register,
    ...word(offset),
]

export const LOAD16 = (register, offset) => [
    opcode.LOAD16,
    register,
    ...word(offset),
]

export const STORE16 = (register, offset) => [
    opcode.STORE16,
    register,
    ...word(offset),
]

export const LOAD_AT = (register, addressRegister) => [
    opcode.LOAD_AT,
    register,
    addressRegister,
    0,
]

export const STORE_AT = (register, addressRegister) => [
    opcode.STORE_AT,
    register,
    addressRegister,
    0,
]

export const LOAD16_AT = (register, addressRegister) => [
    opcode.LOAD16_AT,
    register,
    addressRegister,
    0,
]

export const STORE16_AT = (register, addressRegister) => [
    opcode.STORE16_AT,
    register,
    addressRegister,
    0,
]

export const ADD = (registerA, registerB) => [
    opcode.ADD,
    registerA,
    registerB,
    0,
]

export const SUB = (registerA, registerB) => [
    opcode.SUB,
    registerA,
    registerB,
    0,
]

export const MOD = (registerA, registerB) => [
    opcode.MOD,
    registerA,
    registerB,
    0,
]

export const CMP = (registerA, registerB) => [
    opcode.CMP,
    registerA,
    registerB,
    0,
]

const jump = (operation, target) => {
    if (typeof target === 'string') {
        return {
            type: 'jump',
            operation,
            target,
        }
    }

    return [
        operation,
        ...word(target),
        0,
    ]
}

export const JMP = target => jump(opcode.JMP, target)
export const JE = target => jump(opcode.JE, target)
export const JNE = target => jump(opcode.JNE, target)

export const SYSCALL = number => {
    const [low, high] = word(number)

    return [
        opcode.SYSCALL,
        low,
        high,
        0,
    ]
}

export const HALT = () => [
    opcode.HALT,
    0,
    0,
    0,
]

export const NOP = () => [
    opcode.NOP,
    0,
    0,
    0,
]

export const LABEL = name => ({
    type: 'label',
    name,
})

/*
    Two-pass tiny assembler.

    First pass:
        determine where labels live

    Second pass:
        turn everything into actual machine-code bytes
*/
export const assemble = (...instructions) => {
    const labels = {}

    let address = 0

    for (const instruction of instructions) {
        if (instruction.type === 'label') {
            labels[instruction.name] = address
            continue
        }

        address += 4
    }

    const bytes = []

    for (const instruction of instructions) {
        if (instruction.type === 'label') {
            continue
        }

        if (instruction.type === 'jump') {
            const target = labels[instruction.target]

            bytes.push(
                instruction.operation,
                ...word(target),
                0
            )

            continue
        }

        bytes.push(...instruction)
    }

    return new Uint8Array(bytes)
}
