import { process } from './process.js'
import { scheduler } from './scheduler.js'
import { screen } from './screen.js'
import { timer } from './timer.js'

export const kernel = {
    run() {
        screen.start()
        process.spawn('/sbin/init')
        process.spawn('/bin/animate')
        process.spawn('/games/snake')
        timer.start(scheduler.run)
    },
}
