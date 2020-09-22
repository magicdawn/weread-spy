import {CommandModule} from 'yargs'
import pptr from 'puppeteer'
import fse from 'fs-extra'
import path from 'path'
import {genEpubFor, checkEpub} from '../utils/epub'
import {APP_ROOT} from '../utils/common'

const userDataDir = path.join(APP_ROOT, 'data/pptr')

const downloadCommand: CommandModule = {
  command: 'gen-epub',
  describe: 'gen ePub file',
  aliases: ['gen'],
  builder(yargs) {
    return yargs
      .option('url', {
        alias: 'u',
        desc:
          'book start url. e.g(https://weread.qq.com/web/reader/41432f705de453414ca0b4akc81322c012c81e728d9d180)',
        required: true,
      })
      .option('clean', {
        alias: 'c',
        desc: 'clean up cache resources(current: imgs only)',
      })
  },
  handler(argv) {
    console.log(argv)
    const url = argv.url as string
    const clean = argv.clean as boolean
    main({url, clean})
  },
}
export default downloadCommand

async function main({url, clean}: {url: string; clean: boolean}) {
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
