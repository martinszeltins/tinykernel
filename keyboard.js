export const keyboardCode = {
    NONE: 0,
    UP: 1,
    RIGHT: 2,
    DOWN: 3,
    LEFT: 4,
}

let currentKey = keyboardCode.NONE

const start = () => {
    if (!process.stdin.isTTY) {
        return
    }

    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')

    process.stdin.on('data', key => {
        if (key === '\u0003') {
            process.stdin.setRawMode(false)
            process.exit(0)
        }

        if (key === '\u001b[A' || key.toLowerCase() === 'w') {
            currentKey = keyboardCode.UP
        }

        if (key === '\u001b[C' || key.toLowerCase() === 'd') {
            currentKey = keyboardCode.RIGHT
        }

        if (key === '\u001b[B' || key.toLowerCase() === 's') {
            currentKey = keyboardCode.DOWN
        }

        if (key === '\u001b[D' || key.toLowerCase() === 'a') {
            currentKey = keyboardCode.LEFT
        }
    })
}

/*
    Reading the keyboard register consumes the key.

    Afterward it goes back to NONE until another
    physical key is pressed.
*/
const read = () => {
    const key = currentKey

    currentKey = keyboardCode.NONE

    return key
}

export const keyboard = {
    start,
    read,
}
