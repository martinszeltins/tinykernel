import { monitor } from './monitor.js'
import { process } from './process.js'
import { scheduler } from './scheduler.js'

export const kernel = {
    run() {
        process.spawn('/sbin/init')
        scheduler.run()
        monitor.render()
    },
}
