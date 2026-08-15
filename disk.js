import { FRAMEBUFFER_ADDRESS, FRAMEBUFFER_HEIGHT, FRAMEBUFFER_WIDTH, KEYBOARD_ADDRESS } from './memory.js'
import { ADD, assemble, CMP, JE, JMP, JNE, LABEL, LOAD, LOAD16, LOAD16_AT, LOAD_AT, MOD, MOV, NOP, R0, R1, R2, R3, STORE, STORE16, STORE16_AT, STORE_AT, SUB, SYSCALL } from './asm.js'
import { keyboardCode } from './keyboard.js'
import { syscallNumber } from './syscall.js'

const bytes = new Uint8Array(1024 * 1024)

/*
    /sbin/init
*/

const initProgram = assemble(
    MOV(R0, 72),
    STORE(R0, FRAMEBUFFER_ADDRESS),

    MOV(R0, 69),
    STORE(R0, FRAMEBUFFER_ADDRESS + 1),

    MOV(R0, 76),
    STORE(R0, FRAMEBUFFER_ADDRESS + 2),

    MOV(R0, 76),
    STORE(R0, FRAMEBUFFER_ADDRESS + 3),

    MOV(R0, 79),
    STORE(R0, FRAMEBUFFER_ADDRESS + 4),

    JMP(40)
)

/*
    /bin/animate
*/

const ANIMATION_ROW = 2
const animationStartAddress = FRAMEBUFFER_ADDRESS + FRAMEBUFFER_WIDTH * ANIMATION_ROW

const animationInstructions = [
    MOV(R0, 32),
    MOV(R1, 42),
    STORE(R1, animationStartAddress),
]

const addAnimationStep = (oldPosition, newPosition) => {
    animationInstructions.push(
        STORE(R0, animationStartAddress + oldPosition),
        STORE(R1, animationStartAddress + newPosition)
    )

    /*
        Scheduler now gives 56 instructions.

        Keep /bin/animate at roughly its old speed.
    */
    for (let i = 0; i < 54; i++) {
        animationInstructions.push(NOP())
    }
}

const ANIMATION_LOOP = animationInstructions.length * 4

for (let position = 0; position < 5; position++) {
    addAnimationStep(position, position + 1)
}

for (let position = 5; position > 0; position--) {
    addAnimationStep(position, position - 1)
}

animationInstructions.push(
    JMP(ANIMATION_LOOP)
)

const animationProgram = assemble(...animationInstructions)

/*
    /games/snake

    Snake owns rows 5–24.

    20 rows × 80 columns = 1600 cells.

    Private Snake memory:

    0–1     head cell
    2–3     tail ring-buffer index
    4–5     head ring-buffer index
    6–7     length
    8–9     food cell
    10      direction

    32+     body ring buffer

    Every body entry is a 16-bit cell number.
*/

const SNAKE_TOP_ROW = 5
const SNAKE_GAME_HEIGHT = FRAMEBUFFER_HEIGHT - SNAKE_TOP_ROW
const SNAKE_GAME_SIZE = FRAMEBUFFER_WIDTH * SNAKE_GAME_HEIGHT

const snakeScreenStart = FRAMEBUFFER_ADDRESS + FRAMEBUFFER_WIDTH * SNAKE_TOP_ROW

const HEAD = 0
const TAIL_INDEX = 2
const HEAD_INDEX = 4
const LENGTH = 6
const FOOD = 8
const DIRECTION = 10

const BODY_START = 32

const snakeProgram = assemble(
    /*
        Initial snake:

        #####
    */

    MOV(R0, 35),

    STORE(R0, snakeScreenStart),
    STORE(R0, snakeScreenStart + 1),
    STORE(R0, snakeScreenStart + 2),
    STORE(R0, snakeScreenStart + 3),
    STORE(R0, snakeScreenStart + 4),

    /*
        Body ring buffer:

        [0, 1, 2, 3, 4]
    */

    MOV(R0, 0),
    STORE16(R0, BODY_START),

    MOV(R0, 1),
    STORE16(R0, BODY_START + 2),

    MOV(R0, 2),
    STORE16(R0, BODY_START + 4),

    MOV(R0, 3),
    STORE16(R0, BODY_START + 6),

    MOV(R0, 4),
    STORE16(R0, BODY_START + 8),

    /*
        Initial state.
    */

    MOV(R0, 4),
    STORE16(R0, HEAD),

    MOV(R0, 0),
    STORE16(R0, TAIL_INDEX),

    MOV(R0, 4),
    STORE16(R0, HEAD_INDEX),

    MOV(R0, 5),
    STORE16(R0, LENGTH),

    MOV(R0, keyboardCode.RIGHT),
    STORE(R0, DIRECTION),

    JMP('snake_generate_food'),

    /*
        ========================================
        MAIN GAME LOOP
        ========================================
    */

    LABEL('snake_loop'),

    /*
        Read the memory-mapped keyboard register.

        0 = no key
        1 = up
        2 = right
        3 = down
        4 = left
    */

    LOAD(R0, KEYBOARD_ADDRESS),

    MOV(R1, keyboardCode.NONE),
    CMP(R0, R1),
    JE('snake_move'),

    /*
        UP

        Ignore an immediate reversal from DOWN.
    */

    MOV(R1, keyboardCode.UP),
    CMP(R0, R1),
    JNE('snake_check_right'),

    LOAD(R1, DIRECTION),
    MOV(R2, keyboardCode.DOWN),
    CMP(R1, R2),
    JE('snake_move'),

    MOV(R0, keyboardCode.UP),
    STORE(R0, DIRECTION),
    JMP('snake_move'),

    /*
        RIGHT
    */

    LABEL('snake_check_right'),

    MOV(R1, keyboardCode.RIGHT),
    CMP(R0, R1),
    JNE('snake_check_down'),

    LOAD(R1, DIRECTION),
    MOV(R2, keyboardCode.LEFT),
    CMP(R1, R2),
    JE('snake_move'),

    MOV(R0, keyboardCode.RIGHT),
    STORE(R0, DIRECTION),
    JMP('snake_move'),

    /*
        DOWN
    */

    LABEL('snake_check_down'),

    MOV(R1, keyboardCode.DOWN),
    CMP(R0, R1),
    JNE('snake_check_left'),

    LOAD(R1, DIRECTION),
    MOV(R2, keyboardCode.UP),
    CMP(R1, R2),
    JE('snake_move'),

    MOV(R0, keyboardCode.DOWN),
    STORE(R0, DIRECTION),
    JMP('snake_move'),

    /*
        LEFT
    */

    LABEL('snake_check_left'),

    MOV(R1, keyboardCode.LEFT),
    CMP(R0, R1),
    JNE('snake_move'),

    LOAD(R1, DIRECTION),
    MOV(R2, keyboardCode.RIGHT),
    CMP(R1, R2),
    JE('snake_move'),

    MOV(R0, keyboardCode.LEFT),
    STORE(R0, DIRECTION),

    /*
        ========================================
        CALCULATE NEW HEAD
        ========================================
    */

    LABEL('snake_move'),

    LOAD16(R0, HEAD),
    LOAD(R1, DIRECTION),

    MOV(R2, keyboardCode.UP),
    CMP(R1, R2),
    JE('snake_move_up'),

    MOV(R2, keyboardCode.RIGHT),
    CMP(R1, R2),
    JE('snake_move_right'),

    MOV(R2, keyboardCode.DOWN),
    CMP(R1, R2),
    JE('snake_move_down'),

    JMP('snake_move_left'),

    /*
        UP

        Adding GAME_SIZE - WIDTH and then modulo
        GAME_SIZE wraps from the top to the bottom.
    */

    LABEL('snake_move_up'),

    MOV(R1, SNAKE_GAME_SIZE - FRAMEBUFFER_WIDTH),
    ADD(R0, R1),

    MOV(R1, SNAKE_GAME_SIZE),
    MOD(R0, R1),

    JMP('snake_head_ready'),

    /*
        DOWN
    */

    LABEL('snake_move_down'),

    MOV(R1, FRAMEBUFFER_WIDTH),
    ADD(R0, R1),

    MOV(R1, SNAKE_GAME_SIZE),
    MOD(R0, R1),

    JMP('snake_head_ready'),

    /*
        RIGHT
    */

    LABEL('snake_move_right'),

    /*
        R2 = current column
    */

    MOV(R2, 0),
    ADD(R2, R0),

    MOV(R3, FRAMEBUFFER_WIDTH),
    MOD(R2, R3),

    /*
        Normally head++.
    */

    MOV(R3, 1),
    ADD(R0, R3),

    /*
        If we were at column 79, subtract 80 so
        we wrap to column 0 of the same row.
    */

    MOV(R3, FRAMEBUFFER_WIDTH - 1),
    CMP(R2, R3),
    JNE('snake_head_ready'),

    MOV(R3, FRAMEBUFFER_WIDTH),
    SUB(R0, R3),

    JMP('snake_head_ready'),

    /*
        LEFT
    */

    LABEL('snake_move_left'),

    MOV(R2, 0),
    ADD(R2, R0),

    MOV(R3, FRAMEBUFFER_WIDTH),
    MOD(R2, R3),

    /*
        Normally head--.
    */

    MOV(R3, 1),
    SUB(R0, R3),

    /*
        If we were at column 0, add 80 so we wrap
        to column 79 of the same row.
    */

    MOV(R3, 0),
    CMP(R2, R3),
    JNE('snake_head_ready'),

    MOV(R3, FRAMEBUFFER_WIDTH),
    ADD(R0, R3),

    /*
        ========================================
        SAVE NEW HEAD
        ========================================
    */

    LABEL('snake_head_ready'),

    STORE16(R0, HEAD),

    /*
        Advance head ring-buffer index.

        headIndex =
            (headIndex + 1) % GAME_SIZE
    */

    LOAD16(R1, HEAD_INDEX),

    MOV(R2, 1),
    ADD(R1, R2),

    MOV(R2, SNAKE_GAME_SIZE),
    MOD(R1, R2),

    STORE16(R1, HEAD_INDEX),

    /*
        Calculate:

            BODY_START + headIndex * 2

        R2 becomes the address of the new
        ring-buffer entry.
    */

    MOV(R2, 0),
    ADD(R2, R1),
    ADD(R2, R1),

    MOV(R3, BODY_START),
    ADD(R2, R3),

    /*
        Store the new head cell into the body array.
    */

    STORE16_AT(R0, R2),

    /*
        Draw the new head.
    */

    MOV(R1, snakeScreenStart),
    ADD(R1, R0),

    MOV(R2, 35),
    STORE_AT(R2, R1),

    /*
        Did we eat the food?
    */

    LOAD16(R1, FOOD),
    CMP(R0, R1),
    JE('snake_food_eaten'),

    /*
        ========================================
        NORMAL MOVEMENT

        Remove old tail.
        ========================================
    */

    LOAD16(R1, TAIL_INDEX),

    /*
        R2 =
            BODY_START + tailIndex * 2
    */

    MOV(R2, 0),
    ADD(R2, R1),
    ADD(R2, R1),

    MOV(R3, BODY_START),
    ADD(R2, R3),

    /*
        R0 = old tail cell
    */

    LOAD16_AT(R0, R2),

    /*
        Erase tail from framebuffer.
    */

    MOV(R1, snakeScreenStart),
    ADD(R1, R0),

    MOV(R2, 32),
    STORE_AT(R2, R1),

    /*
        Advance tail ring-buffer index.
    */

    LOAD16(R0, TAIL_INDEX),

    MOV(R1, 1),
    ADD(R0, R1),

    MOV(R1, SNAKE_GAME_SIZE),
    MOD(R0, R1),

    STORE16(R0, TAIL_INDEX),

    JMP('snake_loop'),

    /*
        ========================================
        FOOD EATEN

        Don't move the tail.

        Therefore the newly-added head remains,
        making the snake one cell longer.
        ========================================
    */

    LABEL('snake_food_eaten'),

    LOAD16(R0, LENGTH),

    MOV(R1, 1),
    ADD(R0, R1),

    STORE16(R0, LENGTH),

    /*
        If the snake fills the entire playfield,
        there is nowhere left to put food.
    */

    MOV(R1, SNAKE_GAME_SIZE),
    CMP(R0, R1),
    JE('snake_loop'),

    /*
        ========================================
        GENERATE RANDOM FOOD

        Keep trying until we find a framebuffer
        cell that is not occupied by '#'.
        ========================================
    */

    LABEL('snake_generate_food'),

    MOV(R0, SNAKE_GAME_SIZE),
    SYSCALL(syscallNumber.RANDOM),

    /*
        Convert game cell to framebuffer address.
    */

    MOV(R1, snakeScreenStart),
    ADD(R1, R0),

    /*
        What's currently on that screen cell?
    */

    LOAD_AT(R2, R1),

    /*
        If it contains '#', that's part of the
        snake. Try another random cell.
    */

    MOV(R3, 35),
    CMP(R2, R3),
    JE('snake_generate_food'),

    /*
        Save food cell.
    */

    STORE16(R0, FOOD),

    /*
        Draw '*'.
    */

    MOV(R2, 42),
    STORE_AT(R2, R1),

    JMP('snake_loop')
)

/*
    Filesystem.
*/

const INIT_START = 1024
const ANIMATION_START = INIT_START + initProgram.length
const SNAKE_START = ANIMATION_START + animationProgram.length

const fileTable = [
    {
        id: 1,
        parentDirID: 0,
        type: 'directory',
        name: 'sbin',
    },
    {
        id: 2,
        parentDirID: 1,
        type: 'file',
        name: 'init',
        start: INIT_START,
        size: initProgram.length,
    },
    {
        id: 3,
        parentDirID: 0,
        type: 'directory',
        name: 'bin',
    },
    {
        id: 4,
        parentDirID: 3,
        type: 'file',
        name: 'animate',
        start: ANIMATION_START,
        size: animationProgram.length,
    },
    {
        id: 5,
        parentDirID: 0,
        type: 'directory',
        name: 'games',
    },
    {
        id: 6,
        parentDirID: 5,
        type: 'file',
        name: 'snake',
        start: SNAKE_START,
        size: snakeProgram.length,
    },
]

const fileTableBytes = new TextEncoder().encode(JSON.stringify(fileTable))

bytes.set(fileTableBytes, 0)
bytes.set(initProgram, INIT_START)
bytes.set(animationProgram, ANIMATION_START)
bytes.set(snakeProgram, SNAKE_START)

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
