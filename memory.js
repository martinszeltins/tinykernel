/*
    1 MiB RAM

    0 ─────────────────────────────────────
        KERNEL
        64 KiB

    65536 ─────────────────────────────────
        PROGRAMS
        448 KiB

    524288 ────────────────────────────────
        PROCESS DATA

        Each process gets its own private
        fixed-size data region.

    ───────────────────────────────────────
        FRAMEBUFFER

        80 × 25 characters
        2000 bytes

    1048576 ───────────────────────────────


    PROCESS-VISIBLE ADDRESS SPACE

    0x0000 ────────────────────────────────
        private process data

    0xF000 ────────────────────────────────
        framebuffer
*/

const RAM_SIZE = 1024 * 1024

const KERNEL_SIZE = 64 * 1024

const PROGRAM_AREA_START = KERNEL_SIZE
const PROGRAM_AREA_SIZE = 448 * 1024

const DATA_AREA_START =
    PROGRAM_AREA_START +
    PROGRAM_AREA_SIZE

export const FRAMEBUFFER_ADDRESS = 0xf000
export const FRAMEBUFFER_WIDTH = 80
export const FRAMEBUFFER_HEIGHT = 25

const FRAMEBUFFER_SIZE =
    FRAMEBUFFER_WIDTH *
    FRAMEBUFFER_HEIGHT

const FRAMEBUFFER_START =
    RAM_SIZE -
    FRAMEBUFFER_SIZE

/*
    Addresses 0x0000–0xEFFF belong to the
    process's private data.

    0xF000 and above are reserved for devices.
*/
const DATA_SIZE_PER_PROCESS = FRAMEBUFFER_ADDRESS

const bytes = new Uint8Array(RAM_SIZE)

const freeProgramBlocks = [
    {
        start: PROGRAM_AREA_START,
        size: PROGRAM_AREA_SIZE,
    },
]

const freeDataSlots = []

for (
    let address = DATA_AREA_START;
    address + DATA_SIZE_PER_PROCESS <= FRAMEBUFFER_START;
    address += DATA_SIZE_PER_PROCESS
) {
    freeDataSlots.push(address)
}

const read = address => {
    return bytes[address]
}

const write = (address, value) => {
    bytes[address] = value
}

/*
    Read from an address as seen by a process.

    Normal addresses point into that process's
    private data region.

    Addresses beginning at 0xF000 point to the
    shared framebuffer.
*/
const readProcess = (process, address) => {
    if (
        address >= FRAMEBUFFER_ADDRESS &&
        address < FRAMEBUFFER_ADDRESS + FRAMEBUFFER_SIZE
    ) {
        const framebufferOffset =
            address - FRAMEBUFFER_ADDRESS

        return bytes[
            FRAMEBUFFER_START +
            framebufferOffset
        ]
    }

    if (address < process.dataSize) {
        return bytes[
            process.dataStart +
            address
        ]
    }

    return 0
}

/*
    Same idea as readProcess(), but for writing.
*/
const writeProcess = (process, address, value) => {
    if (
        address >= FRAMEBUFFER_ADDRESS &&
        address < FRAMEBUFFER_ADDRESS + FRAMEBUFFER_SIZE
    ) {
        const framebufferOffset =
            address - FRAMEBUFFER_ADDRESS

        bytes[
            FRAMEBUFFER_START +
            framebufferOffset
        ] = value

        return
    }

    if (address < process.dataSize) {
        bytes[
            process.dataStart +
            address
        ] = value
    }
}

/*
    Used by our real terminal monitor to inspect
    the simulated framebuffer.
*/
const readFramebuffer = offset => {
    return bytes[
        FRAMEBUFFER_START +
        offset
    ]
}

const loadProgram = program => {
    const blockIndex = freeProgramBlocks.findIndex(
        block => block.size >= program.length
    )

    const block = freeProgramBlocks[blockIndex]
    const start = block.start

    bytes.set(program, start)

    block.start += program.length
    block.size -= program.length

    if (block.size === 0) {
        freeProgramBlocks.splice(blockIndex, 1)
    }

    return start
}

const freeProgram = (start, size) => {
    bytes.fill(0, start, start + size)

    freeProgramBlocks.push({
        start,
        size,
    })

    freeProgramBlocks.sort(
        (first, second) => first.start - second.start
    )

    for (let i = 0; i < freeProgramBlocks.length - 1; i++) {
        const current = freeProgramBlocks[i]
        const next = freeProgramBlocks[i + 1]

        if (current.start + current.size === next.start) {
            current.size += next.size
            freeProgramBlocks.splice(i + 1, 1)
            i--
        }
    }
}

const allocateData = () => {
    const start = freeDataSlots.shift()

    return {
        start,
        size: DATA_SIZE_PER_PROCESS,
    }
}

const freeData = start => {
    bytes.fill(0, start, start + DATA_SIZE_PER_PROCESS)

    freeDataSlots.push(start)
    freeDataSlots.sort((first, second) => first - second)
}

export const memory = {
    read,
    write,
    readProcess,
    writeProcess,
    readFramebuffer,
    loadProgram,
    freeProgram,
    allocateData,
    freeData,
}
