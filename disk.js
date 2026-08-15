import { FRAMEBUFFER_ADDRESS, FRAMEBUFFER_HEIGHT, FRAMEBUFFER_WIDTH, KEYBOARD_ADDRESS } from './memory.js'
import { ADD, assemble, CMP, HALT, JE, JMP, JNE, LABEL, LOAD, LOAD16, LOAD16_AT, LOAD_AT, MOD, MOV, NOP, R0, R1, R2, R3, STORE, STORE16, STORE16_AT, STORE_AT, SUB, SYSCALL } from './asm.js'
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
        Initial snake.
    */

    MOV(R0, 35),

    STORE(R0, snakeScreenStart),
    STORE(R0, snakeScreenStart + 1),
    STORE(R0, snakeScreenStart + 2),
    STORE(R0, snakeScreenStart + 3),
    STORE(R0, snakeScreenStart + 4),

    /*
        Body ring buffer.
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

    LOAD(R0, KEYBOARD_ADDRESS),

    MOV(R1, keyboardCode.NONE),
    CMP(R0, R1),
    JE('snake_move'),

    /*
        UP
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

    LABEL('snake_move_up'),

    MOV(R1, SNAKE_GAME_SIZE - FRAMEBUFFER_WIDTH),
    ADD(R0, R1),

    MOV(R1, SNAKE_GAME_SIZE),
    MOD(R0, R1),

    JMP('snake_head_ready'),

    LABEL('snake_move_down'),

    MOV(R1, FRAMEBUFFER_WIDTH),
    ADD(R0, R1),

    MOV(R1, SNAKE_GAME_SIZE),
    MOD(R0, R1),

    JMP('snake_head_ready'),

    LABEL('snake_move_right'),

    MOV(R2, 0),
    ADD(R2, R0),

    MOV(R3, FRAMEBUFFER_WIDTH),
    MOD(R2, R3),

    MOV(R3, 1),
    ADD(R0, R3),

    MOV(R3, FRAMEBUFFER_WIDTH - 1),
    CMP(R2, R3),
    JNE('snake_head_ready'),

    MOV(R3, FRAMEBUFFER_WIDTH),
    SUB(R0, R3),

    JMP('snake_head_ready'),

    LABEL('snake_move_left'),

    MOV(R2, 0),
    ADD(R2, R0),

    MOV(R3, FRAMEBUFFER_WIDTH),
    MOD(R2, R3),

    MOV(R3, 1),
    SUB(R0, R3),

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

    LOAD16(R1, HEAD_INDEX),

    MOV(R2, 1),
    ADD(R1, R2),

    MOV(R2, SNAKE_GAME_SIZE),
    MOD(R1, R2),

    STORE16(R1, HEAD_INDEX),

    /*
        BODY_START + headIndex * 2
    */

    MOV(R2, 0),
    ADD(R2, R1),
    ADD(R2, R1),

    MOV(R3, BODY_START),
    ADD(R2, R3),

    STORE16_AT(R0, R2),

    /*
        Draw head.
    */

    MOV(R1, snakeScreenStart),
    ADD(R1, R0),

    MOV(R2, 35),
    STORE_AT(R2, R1),

    /*
        Food?
    */

    LOAD16(R1, FOOD),
    CMP(R0, R1),
    JE('snake_food_eaten'),

    /*
        ========================================
        NORMAL MOVEMENT
        ========================================
    */

    LOAD16(R1, TAIL_INDEX),

    MOV(R2, 0),
    ADD(R2, R1),
    ADD(R2, R1),

    MOV(R3, BODY_START),
    ADD(R2, R3),

    LOAD16_AT(R0, R2),

    /*
        Erase tail.
    */

    MOV(R1, snakeScreenStart),
    ADD(R1, R0),

    MOV(R2, 32),
    STORE_AT(R2, R1),

    /*
        Advance tail index.
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
        ========================================
    */

    LABEL('snake_food_eaten'),

    LOAD16(R0, LENGTH),

    MOV(R1, 1),
    ADD(R0, R1),

    STORE16(R0, LENGTH),

    MOV(R1, SNAKE_GAME_SIZE),
    CMP(R0, R1),
    JE('snake_loop'),

    /*
        ========================================
        GENERATE FOOD
        ========================================
    */

    LABEL('snake_generate_food'),

    MOV(R0, SNAKE_GAME_SIZE),
    SYSCALL(syscallNumber.RANDOM),

    MOV(R1, snakeScreenStart),
    ADD(R1, R0),

    LOAD_AT(R2, R1),

    MOV(R3, 35),
    CMP(R2, R3),
    JE('snake_generate_food'),

    STORE16(R0, FOOD),

    MOV(R2, 42),
    STORE_AT(R2, R1),

    JMP('snake_loop')
)

/*
    ============================================
    IPC DEMO
    ============================================

    /bin/receiver = PID 4
    /bin/sender   = PID 5

    Sender sends:

        !

    Receiver sends back:

        A

    The communication goes entirely through
    kernel IPC.
*/

const IPC_ROW = 3
const ipcDisplayAddress = FRAMEBUFFER_ADDRESS + FRAMEBUFFER_WIDTH * IPC_ROW

/*
    /bin/receiver

    First wait for a message.

    RECEIVE returns:

        R0 = sender PID
        R1 = message

    Then send an acknowledgment back to the
    sender using the returned PID.
*/

const receiverProgram = assemble(
    MOV(R0, 73),                       // I
    STORE(R0, ipcDisplayAddress),

    MOV(R0, 80),                       // P
    STORE(R0, ipcDisplayAddress + 1),

    MOV(R0, 67),                       // C
    STORE(R0, ipcDisplayAddress + 2),

    MOV(R0, 58),                       // :
    STORE(R0, ipcDisplayAddress + 3),

    MOV(R0, 32),                       // space
    STORE(R0, ipcDisplayAddress + 4),

    LABEL('receiver_loop'),

    /*
        Block here until somebody sends us something.
    */
    SYSCALL(syscallNumber.RECEIVE),

    /*
        Display received message.
    */
    STORE(R1, ipcDisplayAddress + 5),

    /*
        R0 still contains the sender PID.

        Send "A" back as an acknowledgment.
    */
    MOV(R1, 65),                       // A
    SYSCALL(syscallNumber.SEND),

    JMP('receiver_loop')
)

/*
    /bin/sender

    Receiver is PID 4 because kernel.js deliberately
    spawns it fourth.

    Send "!" and then block waiting for the reply.
*/

const RECEIVER_PID = 4

const senderProgram = assemble(
    MOV(R0, RECEIVER_PID),
    MOV(R1, 33),                       // !
    SYSCALL(syscallNumber.SEND),

    /*
        Wait for receiver's acknowledgment.
    */
    SYSCALL(syscallNumber.RECEIVE),

    /*
        R1 now contains "A".
    */
    STORE(R1, ipcDisplayAddress + 7),

    HALT()
)

/*
    ============================================
    FILESYSTEM
    ============================================
*/

const INIT_START = 1024
const ANIMATION_START = INIT_START + initProgram.length
const SNAKE_START = ANIMATION_START + animationProgram.length
const RECEIVER_START = SNAKE_START + snakeProgram.length
const SENDER_START = RECEIVER_START + receiverProgram.length

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
    {
        id: 7,
        parentDirID: 3,
        type: 'file',
        name: 'receiver',
        start: RECEIVER_START,
        size: receiverProgram.length,
    },
    {
        id: 8,
        parentDirID: 3,
        type: 'file',
        name: 'sender',
        start: SENDER_START,
        size: senderProgram.length,
    },
]

const fileTableBytes = new TextEncoder().encode(JSON.stringify(fileTable))

bytes.set(fileTableBytes, 0)

bytes.set(initProgram, INIT_START)
bytes.set(animationProgram, ANIMATION_START)
bytes.set(snakeProgram, SNAKE_START)
bytes.set(receiverProgram, RECEIVER_START)
bytes.set(senderProgram, SENDER_START)

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
