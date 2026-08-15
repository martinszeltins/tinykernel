export const syscallNumber = {
    RANDOM: 1,
}

/*
    Handle requests from user programs into the kernel.

    RANDOM:
        R0 contains the maximum value.
        R0 receives the random result.
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
