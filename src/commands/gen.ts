import { Command, Option } from 'clipanion'
import path from 'path'
import { currentBooks } from '../common/books-map'
import { checkEpub, genEpubFor } from '../utils/epub'

export default class extends Command {
  static usage = Command.Usage({
    description: `根据已下载的信息生成 epub 文件`,
  })

  static paths = [['gen'], ['gen-epub']]

  url = Option.String('-u,--url', {
    description:
      'book start url. e.g(https://weread.qq.com/web/reader/41432f705de453414ca0b4akc81322c012c81e728d9d180)',
  })

  id = Option.String('-i,--id', {
    description: 'book id. e.g(812443)',
  })

  clean = Option.Boolean('-c,--clean', {
    description: 'clean imgs before gen',
  })

  dir = Option.String('-d,--dir', {
    description: 'epub 文件输出目录, 默认当前文件夹',
  })

  async execute() {
    const { url, clean, id, dir } = this
    main({ url, clean: Boolean(clean), id, dir })
  }
}

export async function main({
  url,
  clean,
  id,
  dir,
}: {
  url?: string
  clean: boolean
  id?: string
  dir?: string
}) {
  let bookId: string | undefined
  if (id) {
    bookId = id
  }
  // url => id
  else if (url) {
    bookId = currentBooks.find((x) => x.url === url)?.id
  }

  if (!bookId) {
    console.error('can not find id !!!')
    return
  }

  // normalize
  dir = path.resolve(dir || process.cwd())

  await genEpubFor(bookId, dir, clean)
  return await checkEpub(bookId, dir)
}
