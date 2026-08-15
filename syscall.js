export const syscallNumber = {
    RANDOM: 1,
}

/*
    RANDOM

    Input:
        R0 = maximum

    Output:
        R0 = random number from 0 to maximum - 1
*/
const handle = (process, number) => {
    if (number === syscallNumber.RANDOM) {
        const max = process.registers[0]

        process.registers[0] = Math.floor(
            Math.random() * max
        )
    }
}

export const syscall = {
    handle,
}
