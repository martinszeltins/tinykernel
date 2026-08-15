import { filesystem } from './filesystem.js'
import { ipc } from './ipc.js'
import { memory } from './memory.js'

const processes = []

let nextPID = 1

const spawn = path => {
    const program = filesystem.read(path)

    const programStart = memory.loadProgram(program)
    const data = memory.allocateData()

    const newProcess = {
        pid: nextPID++,
        state: 'ready',

        programStart,
        programSize: program.length,

        dataStart: data.start,
        dataSize: data.size,

        instructionPointer: 0,

        registers: [0, 0, 0, 0],
        zeroFlag: false,
    }

    processes.push(newProcess)
    ipc.register(newProcess)

    return newProcess
}

const exit = currentProcess => {
    memory.freeProgram(
        currentProcess.programStart,
        currentProcess.programSize
    )

    memory.freeData(currentProcess.dataStart)

    ipc.unregister(currentProcess.pid)

    const index = processes.indexOf(currentProcess)

    processes.splice(index, 1)
}

export const process = {
    processes,
    spawn,
    exit,
}
