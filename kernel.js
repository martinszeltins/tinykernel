import { keyboard } from './keyboard.js'
import { process } from './process.js'
import { scheduler } from './scheduler.js'
import { screen } from './screen.js'
import { timer } from './timer.js'

export const kernel = {
    run() {
        screen.start()
        keyboard.start()

        process.spawn('/sbin/init')      // PID 1
        process.spawn('/bin/animate')    // PID 2
        process.spawn('/games/snake')   // PID 3

        process.spawn('/bin/receiver')   // PID 4
        process.spawn('/bin/sender')     // PID 5

        timer.start(scheduler.run)
    },
}
