/*
    Simulated hardware timer.

    Every 75 ms the timer fires.

    In a real machine this would eventually cause a timer interrupt.
    In our machine we simply call the kernel's timer handler.
*/

const TICK_MS = 75

const start = onTick => {
    setInterval(onTick, TICK_MS)
}

export const timer = {
    start,
}
