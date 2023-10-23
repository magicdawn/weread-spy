import { genEpubFor } from '$utils/epub'
import epubcheck from '$utils/epubcheck'
import { Command, Option } from 'clipanion'
import { homedir } from 'os'
import path from 'path'
import { currentBooks, queryBookAny } from '../common/books-map.js'

export class GenCommand extends Command {
  static usage = Command.Usage({
    description: `根据已下载的信息生成 epub 文件`,
    details: `<book> can be id/url/title`,
  })

  static paths = [['gen'], ['gen-epub']]

  // book can be
  // url: 'book start url. e.g(https://weread.qq.com/web/reader/41432f705de453414ca0b4akc81322c012c81e728d9d180)',
  // title: %s
  // id: 812443
  book = Option.String({ required: true, name: 'book' })

  clean = Option.Boolean('-c,--clean', {
    description: 'clean imgs before gen',
  })

  dir = Option.String('-d,--dir', {
    description: 'epub 文件输出目录, 默认当前文件夹',
  })

  decompress = Option.Boolean('-D,--debug,--decompress', {
    description: 'decompress .ePub file for debug purpose',
  })

  err(msg: string) {
    console.error('Error: %s', msg)
    process.exit(1)
  }

  async execute() {
    const { clean, dir, decompress } = this

    const book = await queryBookAny(this.book)
    if (!book) return this.err('book not found')

    const id = book.id
    const url = book.url
    await genCommandMain({ url, id, clean: Boolean(clean), dir, decompress })
  }
}

export async function genCommandMain({
  url,
  clean,
  id,
  dir,
  decompress = false,
}: {
  url?: string
  clean: boolean
  id?: string
  dir?: string
  decompress?: boolean
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
  // if run in project root, gen to `example/` subdir
  if (dir === path.join(homedir(), 'projects/weread-spy-private')) {
    dir = path.join(dir, 'example')
  }

  const file = await genEpubFor(bookId, dir, clean, decompress)
  epubcheck(file)

  setTimeout(async () => {
    // console.log('why-is-node-running ->')
    // const { default: log } = await import('why-is-node-running')
    // log()
    // console.log(process.getActiveResourcesInfo())
  }, 100)

  return file
}
