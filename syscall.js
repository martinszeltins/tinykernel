import { ipc } from './ipc.js'

export const syscallNumber = {
    RANDOM: 1,
    SEND: 2,
    RECEIVE: 3,
}

const handle = (currentProcess, number) => {
    const registers = currentProcess.registers

    if (number === syscallNumber.RANDOM) {
        const max = registers[0]

        registers[0] = Math.floor(
            Math.random() * max
        )

        return {
            blocked: false,
        }
    }

    if (number === syscallNumber.SEND) {
        const destinationPID = registers[0]
        const message = registers[1]

        const sent = ipc.send(
            currentProcess.pid,
            destinationPID,
            message
        )

        registers[0] = sent ? 1 : 0

        return {
            blocked: false,
        }
    }

    if (number === syscallNumber.RECEIVE) {
        const message = ipc.receive(currentProcess)

        if (!message) {
            return {
                blocked: true,
            }
        }

        registers[0] = message.senderPID
        registers[1] = message.value

        return {
            blocked: false,
        }
    }

    return {
        blocked: false,
    }
}

export const syscall = {
    handle,
}
