import { scheduler } from './scheduler.js'
import { process } from './process.js'

export const kernel = {
    run() {
        process.spawn('/sbin/init')
        scheduler.run()
    },
}
