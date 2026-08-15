import { process } from './process.js'
import { scheduler } from './scheduler.js'
import { screen } from './screen.js'

export const kernel = {
    run() {
        screen.start()

        process.spawn('/sbin/init')

        while (true) {
            scheduler.run()
            screen.render()
        }
    },
}
