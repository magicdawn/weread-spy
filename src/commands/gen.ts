import {CommandModule} from 'yargs'
import pptr from 'puppeteer'
import fse from 'fs-extra'
import path from 'path'
import {genEpubFor, checkEpub} from '../utils/epub'
import processContent from '../utils/processContent'

const APP_ROOT = path.join(__dirname, '../../')
const userDataDir = path.join(APP_ROOT, 'data/pptr')

const downloadCommand: CommandModule = {
  command: 'gen-epub',
  describe: 'gen ePub file',
  aliases: ['gen'],
  builder(yargs) {
    return yargs.option('url', {
      alias: 'u',
      desc:
        'book start url. e.g(https://weread.qq.com/web/reader/41432f705de453414ca0b4akc81322c012c81e728d9d180)',
      required: true,
    })
  },
  handler(argv) {
    main(argv.url as string)
  },
}
export default downloadCommand

async function main(url: string) {
  let map: any
  try {
    map = await fse.readJsonSync(path.join(APP_ROOT, 'data/book/map.json'))
  } catch (error) {
    map = {}
  }

  const id = map[url]
  if (!id) {
    console.error('can not find id !!!')
  }

  await genEpubFor(id)
  await checkEpub(id)
}
