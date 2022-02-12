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

  id: string = Option.String('-i,--id', {
    description: 'book id. e.g(812443)',
  })

  clean: boolean = Option.Boolean('-c,--clean')

  async execute() {
    const {url, clean, id} = this
    main({url, clean, id})
  }
}

export async function main({url, clean, id}: {url?: string; clean: boolean; id?: string}) {
  let map: unknown
  try {
    map = await fse.readJsonSync(path.join(APP_ROOT, 'data/book/map.json'))
  } catch (error) {
    map = {}
  }

  let bookId = ''

  if (url) {
    ;({bookId} = map[url] || {})
    if (!bookId) {
      return console.error('can not find id !!!')
    }
  }

  if (id) {
    bookId = id
  }

  await genEpubFor(bookId, clean)
  await checkEpub(bookId)
}
