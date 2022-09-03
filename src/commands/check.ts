import { Command, Option } from 'clipanion'
import { globby, globbySync } from 'globby'
import epubcheck from '../utils/epubcheck.js'

export default class CheckCommand extends Command {
  static usage = Command.Usage({
    description: `检查 epub 文件是否符合规范`,
  })

  static paths = [['c'], ['check']]

  files: string[] = Option.Rest({ required: 1 })

  async execute() {
    const files = this.files

    for (const f of files) {
      const pattern = f.includes('*')
      if (pattern) {
        const subfiles = globbySync(f)
        subfiles.forEach((f) => epubcheck(f))
        continue
      }
      if (f) {
        epubcheck(f)
      }
    }
  }
}
