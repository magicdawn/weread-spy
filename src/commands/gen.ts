import fse from 'fs-extra'
import path from 'path'
import {genEpubFor, checkEpub} from '../utils/epub'
import {APP_ROOT} from '../utils/common'
import {Command} from 'clipanion'

export default class extends Command {
  static usage = Command.Usage({
    description: `gen ePub file`,
  })

  @Command.String('-u,--url', {
    description:
      'book start url. e.g(https://weread.qq.com/web/reader/41432f705de453414ca0b4akc81322c012c81e728d9d180)',
  })
  url: string

  @Command.Boolean('-c,--clean')
  clean: boolean

  @Command.Path('gen')
  @Command.Path('gen-epub')
  async execute() {
    const {url, clean} = this
    main({url, clean})
  }
}

export async function main({url, clean}: {url: string; clean: boolean}) {
  let map: any
  try {
    map = await fse.readJsonSync(path.join(APP_ROOT, 'data/book/map.json'))
  } catch (error) {
    map = {}
  }

  const {bookId: id} = map[url] || {}
  if (!id) {
    return console.error('can not find id !!!')
  }

  await genEpubFor(id, clean)
  await checkEpub(id)
}
