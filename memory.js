import { keyboard } from './keyboard.js'

/*
    1 MiB RAM

    PHYSICAL RAM

    0 ─────────────────────────────────────
        KERNEL

    65536 ─────────────────────────────────
        PROGRAMS

    524288 ────────────────────────────────
        PROCESS DATA

    ───────────────────────────────────────
        FRAMEBUFFER

    1048576 ───────────────────────────────


    PROCESS-VISIBLE ADDRESS SPACE

    0x0000 ────────────────────────────────
        private process data

    0xF000 ────────────────────────────────
        framebuffer

    0xF800 ────────────────────────────────
        keyboard register
*/

const RAM_SIZE = 1024 * 1024

const KERNEL_SIZE = 64 * 1024

const PROGRAM_AREA_START = KERNEL_SIZE
const PROGRAM_AREA_SIZE = 448 * 1024

const DATA_AREA_START = PROGRAM_AREA_START + PROGRAM_AREA_SIZE

export const FRAMEBUFFER_ADDRESS = 0xf000
export const FRAMEBUFFER_WIDTH = 80
export const FRAMEBUFFER_HEIGHT = 25

export const KEYBOARD_ADDRESS = 0xf800

const FRAMEBUFFER_SIZE = FRAMEBUFFER_WIDTH * FRAMEBUFFER_HEIGHT
const FRAMEBUFFER_START = RAM_SIZE - FRAMEBUFFER_SIZE

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
    Read an address as seen by a process.

    0xF800        → keyboard hardware
    0xF000...     → framebuffer hardware
    everything else → private process memory
*/
const readProcess = (process, address) => {
    if (address === KEYBOARD_ADDRESS) {
        return keyboard.read()
    }

    if (
        address >= FRAMEBUFFER_ADDRESS &&
        address < FRAMEBUFFER_ADDRESS + FRAMEBUFFER_SIZE
    ) {
        const framebufferOffset = address - FRAMEBUFFER_ADDRESS

        return bytes[FRAMEBUFFER_START + framebufferOffset]
    }

    if (address < process.dataSize) {
        return bytes[process.dataStart + address]
    }

    return 0
}

const writeProcess = (process, address, value) => {
    if (
        address >= FRAMEBUFFER_ADDRESS &&
        address < FRAMEBUFFER_ADDRESS + FRAMEBUFFER_SIZE
    ) {
        const framebufferOffset = address - FRAMEBUFFER_ADDRESS

        bytes[FRAMEBUFFER_START + framebufferOffset] = value

        return
    }

    if (address < process.dataSize) {
        bytes[process.dataStart + address] = value
    }
}

const readFramebuffer = offset => {
    return bytes[FRAMEBUFFER_START + offset]
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

    freeProgramBlocks.sort((first, second) => first.start - second.start)

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
