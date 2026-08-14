/*
    0 ─────────────────────────────────────
        FILE TABLE
    1024 ──────────────────────────────────
        /sbin/init bytes
        /bin/hello bytes
*/

const bytes = new Uint8Array(10_000)

const read = (start, size) => {
    return bytes.slice(start, start + size)
}

const write = (start, data) => {
    bytes.set(data, start)
}

export const disk = {
    read,
    write,
}
