import { keyboard } from './keyboard.js'
import { process } from './process.js'
import { scheduler } from './scheduler.js'
import { screen } from './screen.js'
import { timer } from './timer.js'

export const kernel = {
    run() {
        screen.start()
        keyboard.start()

        process.spawn('/sbin/init')
        process.spawn('/bin/animate')
        process.spawn('/games/snake')

        timer.start(scheduler.run)
    },
}
