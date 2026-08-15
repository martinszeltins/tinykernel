import { memory } from './memory.js'
import { opcode } from './instructions.js'
import { syscall } from './syscall.js'

const INSTRUCTION_SIZE = 4

const read16 = address => {
    const low = memory.read(address)
    const high = memory.read(address + 1)

    return low + high * 256
}

const readProcess16 = (process, address) => {
    const low = memory.readProcess(process, address)
    const high = memory.readProcess(process, address + 1)

    return low + high * 256
}

const writeProcess16 = (process, address, value) => {
    memory.writeProcess(process, address, value & 0xff)
    memory.writeProcess(process, address + 1, (value >> 8) & 0xff)
}

const run = (process, instructionCount) => {
    for (let i = 0; i < instructionCount; i++) {
        const instructionAddress = process.programStart + process.instructionPointer

        const operation = memory.read(instructionAddress)
        const a = memory.read(instructionAddress + 1)

        const registers = process.registers

        if (operation === opcode.MOV) {
            registers[a] = read16(instructionAddress + 2)
        }

        if (operation === opcode.LOAD) {
            const address = read16(instructionAddress + 2)

            registers[a] = memory.readProcess(process, address)
        }

        if (operation === opcode.STORE) {
            const address = read16(instructionAddress + 2)

            memory.writeProcess(process, address, registers[a])
        }

        if (operation === opcode.LOAD16) {
            const address = read16(instructionAddress + 2)

            registers[a] = readProcess16(process, address)
        }

        if (operation === opcode.STORE16) {
            const address = read16(instructionAddress + 2)

            writeProcess16(process, address, registers[a])
        }

        if (operation === opcode.LOAD_AT) {
            const addressRegister = memory.read(instructionAddress + 2)

            registers[a] = memory.readProcess(
                process,
                registers[addressRegister]
            )
        }

        if (operation === opcode.STORE_AT) {
            const addressRegister = memory.read(instructionAddress + 2)

            memory.writeProcess(
                process,
                registers[addressRegister],
                registers[a]
            )
        }

        if (operation === opcode.LOAD16_AT) {
            const addressRegister = memory.read(instructionAddress + 2)

            registers[a] = readProcess16(
                process,
                registers[addressRegister]
            )
        }

        if (operation === opcode.STORE16_AT) {
            const addressRegister = memory.read(instructionAddress + 2)

            writeProcess16(
                process,
                registers[addressRegister],
                registers[a]
            )
        }

        if (operation === opcode.ADD) {
            const registerB = memory.read(instructionAddress + 2)

            registers[a] += registers[registerB]
        }

        if (operation === opcode.SUB) {
            const registerB = memory.read(instructionAddress + 2)

            registers[a] -= registers[registerB]
        }

        if (operation === opcode.MOD) {
            const registerB = memory.read(instructionAddress + 2)

            registers[a] %= registers[registerB]
        }

        if (operation === opcode.CMP) {
            const registerB = memory.read(instructionAddress + 2)

            process.zeroFlag = registers[a] === registers[registerB]
        }

        if (operation === opcode.JMP) {
            process.instructionPointer = read16(instructionAddress + 1)
            continue
        }

        if (operation === opcode.JE && process.zeroFlag) {
            process.instructionPointer = read16(instructionAddress + 1)
            continue
        }

        if (operation === opcode.JNE && !process.zeroFlag) {
            process.instructionPointer = read16(instructionAddress + 1)
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
