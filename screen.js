import { FRAMEBUFFER_HEIGHT, FRAMEBUFFER_WIDTH, memory } from './memory.js'

const render = () => {
    const lines = []

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

        lines.push(line.trimEnd())
    }

    console.log(lines.join('\n').trimEnd())
}

export const monitor = {
    render,
}
