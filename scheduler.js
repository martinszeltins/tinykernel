import { cpu } from './cpu.js'
import { process } from './process.js'

const TIME_SLICE = 2

/**
 * Simple round-robin scheduler.
 *
 * Give every process 2 CPU instructions,
 * then return.
 */
const run = () => {
    for (const currentProcess of [...process.processes]) {
        const hasExited = cpu.run(
            currentProcess,
            TIME_SLICE
        )

        if (hasExited) {
            process.exit(currentProcess)
        }
    }
}

export const scheduler = {
    run,
}
