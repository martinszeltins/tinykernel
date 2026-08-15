import {
    FRAMEBUFFER_HEIGHT,
    FRAMEBUFFER_WIDTH,
    memory,
} from './memory.js'

const render = () => {
    const topBorder = `┌${'─'.repeat(FRAMEBUFFER_WIDTH)}┐`
    const bottomBorder = `└${'─'.repeat(FRAMEBUFFER_WIDTH)}┘`

    console.log(topBorder)

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

        console.log(`│${line}│`)
    }

    console.log(bottomBorder)
}

export const screen = {
    render,
}
