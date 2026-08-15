import { cpu } from './cpu.js'
import { process } from './process.js'

const TIME_SLICE = 56

const run = () => {
    for (const currentProcess of [...process.processes]) {
        if (currentProcess.state !== 'ready') {
            continue
        }

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
