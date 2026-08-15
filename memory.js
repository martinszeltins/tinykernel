/*
1 MiB RAM

0
├─────────────────────────────┐
│ KERNEL                      │ 64 KiB
│                             │
65536
├─────────────────────────────┤
│ PROGRAMS                    │ 448 KiB
│                             │
│ /sbin/init                  │
│ /games/snake                │
│ /games/tictactoe            │
│ ...                         │
524288
├─────────────────────────────┤
│ PROCESS DATA                │ 512 KiB
│                             │
│ PID 1 → 64 KiB           │
│ PID 2 → 64 KiB           │
│ PID 3 → 64 KiB           │
│ ...                         │
1048576
└─────────────────────────────┘
*/

const RAM_SIZE = 1024 * 1024

const KERNEL_SIZE = 64 * 1024

const PROGRAM_AREA_START = KERNEL_SIZE
const PROGRAM_AREA_SIZE = 448 * 1024

const DATA_AREA_START =
    PROGRAM_AREA_START +
    PROGRAM_AREA_SIZE

/*
    Each process gets 64 KiB of private data.

    Because our instruction operands are now 16-bit,
    a program can address offsets 0–65535.
*/
const DATA_SIZE_PER_PROCESS = 64 * 1024

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
    address < RAM_SIZE;
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
    loadProgram,
    freeProgram,
    allocateData,
    freeData,
}
