import fse from 'fs-extra'
import path from 'path'
import {Command, Option} from 'clipanion'
import {genEpubFor, checkEpub} from '../utils/epub'
import {APP_ROOT} from '../utils/common'

export default class extends Command {
  static usage = Command.Usage({
    description: `gen ePub file`,
  })

  static paths = [['gen'], ['gen-epub']]

  url: string = Option.String('-u,--url', {
    description:
      'book start url. e.g(https://weread.qq.com/web/reader/41432f705de453414ca0b4akc81322c012c81e728d9d180)',
  })

  clean: boolean = Option.Boolean('-c,--clean')

  async execute() {
    const {url, clean} = this
    main({url, clean})
  }
}

export async function main({url, clean}: {url: string; clean: boolean}) {
  let map: unknown
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
