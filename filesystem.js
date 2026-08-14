/*
    0 ─────────────────────────────────────
        fileTable = [
            {
                id: 1,
                parentDirID: 0,
                type: "directory",
                name: "sbin"
            },

            {
                id: 2,
                parentDirID: 1,
                type: "file",
                name: "init",
                start: 1024,
                size: 100
            }
        ]
    1024 ──────────────────────────────────
        actual bytes of /sbin/init
        actual bytes of /bin/hello
*/

import { disk } from './disk.js'

const FILE_TABLE_SIZE = 1024
const DATA_START = FILE_TABLE_SIZE

/*
    The file table is stored in the first 1024 bytes of the disk.

    We read those raw bytes and turn them back into the JavaScript
    structure that describes all files and directories.

    Without this table, the filesystem would have no idea where
    files are located on the disk.
*/
const readFileTable = () => {
    const bytes = disk.read(0, FILE_TABLE_SIZE)
    const text = new TextDecoder().decode(bytes).replace(/\0+$/, '')

    return JSON.parse(text)
}

/*
    Resolve a path like: /sbin/init

    We start at the root directory, represented by ID 0.
    First we find "sbin" whose parentDirID is 0.
    Suppose "sbin" has ID 1.

    Then we find "init" whose parentDirID is 1.
    The result is the file table entry for /sbin/init.
*/
const resolve = path => {
    const fileTable = readFileTable()

    /**
     * fileNames = ["sbin", "init"]
     */
    const fileNames = path.split('/').filter(Boolean)

    let parentDirID = 0
    let entry

    for (const fileName of fileNames) {
        entry = fileTable.find(entry =>
            entry.parentDirID === parentDirID &&
            entry.name === fileName
        )

        parentDirID = entry.id
    }

    return entry
}

const read = path => {
    const file = resolve(path)

    return disk.read(file.start, file.size)
}

export const filesystem = {
    read,
}
