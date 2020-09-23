import {CommandModule} from 'yargs'
import {getBrowser} from '../utils/pptr'

const command: CommandModule = {
  command: 'launch',
  describe: 'launch pptr',
  builder(yargs) {
    return yargs
  },
  async handler(argv) {
    const {browser} = await getBrowser()
    // operate here
  },
}

export default command
