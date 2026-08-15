import { cpu } from './cpu.js'
import { process } from './process.js'

const TIME_SLICE = 56

/**
 * Simple round-robin scheduler.
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
