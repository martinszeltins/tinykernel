import { opcode } from './instructions.js'
import { memory } from './memory.js'
import { syscall } from './syscall.js'

const INSTRUCTION_SIZE = 4

const read16 = address => {
    const low = memory.read(address)
    const high = memory.read(address + 1)

    return low + high * 256
}

const run = (process, instructionCount) => {
    for (let i = 0; i < instructionCount; i++) {
        const instructionAddress = process.programStart + process.instructionPointer

        const operation = memory.read(instructionAddress)
        const a = memory.read(instructionAddress + 1)

        const registers = process.registers

        if (operation === opcode.MOV) {
            const value = read16(instructionAddress + 2)

            registers[a] = value
        }

        if (operation === opcode.LOAD) {
            const address = read16(instructionAddress + 2)

            registers[a] = memory.readProcess(process, address)
        }

        if (operation === opcode.STORE) {
            const address = read16(instructionAddress + 2)

            memory.writeProcess(process, address, registers[a])
        }

        /*
            The memory address itself is stored
            inside another register.
        */
        if (operation === opcode.LOAD_AT) {
            const addressRegister = memory.read(instructionAddress + 2)
            const address = registers[addressRegister]

            registers[a] = memory.readProcess(process, address)
        }

        if (operation === opcode.STORE_AT) {
            const addressRegister = memory.read(instructionAddress + 2)
            const address = registers[addressRegister]

            memory.writeProcess(process, address, registers[a])
        }

        if (operation === opcode.ADD) {
            const registerB = memory.read(instructionAddress + 2)

            registers[a] += registers[registerB]
        }

        if (operation === opcode.SUB) {
            const registerB = memory.read(instructionAddress + 2)

            registers[a] -= registers[registerB]
        }

        if (operation === opcode.CMP) {
            const registerB = memory.read(instructionAddress + 2)

            process.zeroFlag = registers[a] === registers[registerB]
        }

        if (operation === opcode.JMP) {
            const target = read16(instructionAddress + 1)

            process.instructionPointer = target
            continue
        }

        if (operation === opcode.JE && process.zeroFlag) {
            const target = read16(instructionAddress + 1)

            process.instructionPointer = target
            continue
        }

        if (operation === opcode.JNE && !process.zeroFlag) {
            const target = read16(instructionAddress + 1)

            process.instructionPointer = target
            continue
        }

        if (operation === opcode.SYSCALL) {
            const number = read16(instructionAddress + 1)

            syscall.handle(process, number)
        }

        if (operation === opcode.HALT) {
            return true
        }

        process.instructionPointer += INSTRUCTION_SIZE
    }

    return false
}

export const cpu = {
    run,
}
