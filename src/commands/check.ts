import epubcheck from '../utils/epubcheck'
import globby from 'globby'
import {Command} from 'clipanion'

export default class CheckCommand extends Command {
  static usage = Command.Usage({
    description: `检查 epub 文件是否符合规范`,
  })

  @Command.Rest({required: 1})
  files: string[]

  @Command.Path('c')
  @Command.Path('check')
  async execute() {
    const files = this.files

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
  }
}
