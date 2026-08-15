import { screen } from './screen.js'
import { process } from './process.js'
import { scheduler } from './scheduler.js'

export const kernel = {
    run() {
        process.spawn('/sbin/init')
        scheduler.run()
        screen.render()
    },
}
