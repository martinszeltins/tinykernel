import { cpu } from './cpu.js'
import { process } from './process.js'

const TIME_SLICE = 3

/**
 * Simple round-robin scheduler.
 */
const run = () => {
    while (process.processes.length > 0) {
        for (const currentProcess of [...process.processes]) {
            const hasExited = cpu.run(currentProcess, TIME_SLICE)

            if (hasExited) {
                process.exit(currentProcess)
            }
        }
    }
}

export const scheduler = {
    run,
}
