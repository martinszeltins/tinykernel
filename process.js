import { filesystem } from './filesystem.js'

const processes = []

const spawn = path => {
    const program = filesystem.read(path)

    const newProcess = {
        pid: processes.length + 1,
        program,
        instructionPointer: 0,
    }

    processes.push(newProcess)

    return newProcess
}

export const process = {
    processes,
    spawn,
}
