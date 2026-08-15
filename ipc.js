/*
    Very small kernel IPC system.

    Every process gets a mailbox.

    Messages contain:

        sender PID
        16-bit value
*/

const mailboxes = new Map()

const register = currentProcess => {
    mailboxes.set(currentProcess.pid, {
        process: currentProcess,
        messages: [],
    })
}

const unregister = pid => {
    mailboxes.delete(pid)
}

/*
    Send one 16-bit message to another process.

    If the receiving process was blocked waiting
    for a message, wake it up.
*/
const send = (senderPID, destinationPID, value) => {
    const mailbox = mailboxes.get(destinationPID)

    if (!mailbox) {
        return false
    }

    mailbox.messages.push({
        senderPID,
        value: value & 0xffff,
    })

    if (mailbox.process.state === 'blocked') {
        mailbox.process.state = 'ready'
    }

    return true
}

/*
    Receive the oldest message.

    If there is no message, block the process.
*/
const receive = currentProcess => {
    const mailbox = mailboxes.get(currentProcess.pid)

    if (mailbox.messages.length === 0) {
        currentProcess.state = 'blocked'

        return null
    }

    return mailbox.messages.shift()
}

export const ipc = {
    register,
    unregister,
    send,
    receive,
}
