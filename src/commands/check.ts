import {CommandModule} from 'yargs'
import epubcheck from '../utils/epubcheck'
import globby from 'globby'

const command: CommandModule = {
  command: 'check',
  describe: 'check the epub file',
  builder(yargs) {
    return yargs
  },
  async handler(argv) {
    const files = argv._.slice(1) // [0] = check

    for (let f of files) {
      const pattern = f.includes('*')
      if (pattern) {
        const subfiles = globby.sync(f)
        subfiles.forEach((f) => epubcheck(f))
        continue
      }

      if (f) {
        epubcheck(f)
      }
    }
  },
}

export default command
