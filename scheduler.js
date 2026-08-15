import { cpu } from './cpu.js'
import { process } from './process.js'

const TIME_SLICE = 3

/**
 * Give every process one CPU time slice.
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
