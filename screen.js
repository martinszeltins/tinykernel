import {
    FRAMEBUFFER_HEIGHT,
    FRAMEBUFFER_WIDTH,
    memory,
} from './memory.js'

let previousFrame = ''

const start = () => {
    process.stdout.write('\x1b[2J\x1b[H')
}

const render = () => {
    const lines = []

    lines.push(
        `┌${'─'.repeat(FRAMEBUFFER_WIDTH)}┐`
    )

    for (let row = 0; row < FRAMEBUFFER_HEIGHT; row++) {
        let line = ''

        for (let column = 0; column < FRAMEBUFFER_WIDTH; column++) {
            const offset =
                row * FRAMEBUFFER_WIDTH +
                column

            const value = memory.readFramebuffer(offset)

            line += value
                ? String.fromCharCode(value)
                : ' '
        }

        lines.push(`│${line}│`)
    }

    lines.push(
        `└${'─'.repeat(FRAMEBUFFER_WIDTH)}┘`
    )

    const frame = lines.join('\n')

    /*
        Only redraw the real terminal when the simulated
        framebuffer has actually changed.
    */
    if (frame === previousFrame) {
        return
    }

    previousFrame = frame

    process.stdout.write(`\x1b[H${frame}`)
}

export const screen = {
    start,
    render,
}
