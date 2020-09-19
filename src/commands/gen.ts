import {CommandModule} from 'yargs'
import pptr from 'puppeteer'
import fse from 'fs-extra'
import path from 'path'
import {genEpubFor, checkEpub} from '../utils/epub'
import processContent from '../utils/processContent'

const APP_ROOT = path.join(__dirname, '../../')
const userDataDir = path.join(APP_ROOT, 'data/pptr')

const downloadCommand: CommandModule = {
  command: 'gen-epub <id>',
  describe: 'gen ePub file',
  aliases: ['dl'],
  builder(yargs) {
    return yargs.positional('id', {
      desc: 'book id, e.g(25462428)',
      required: true,
    })
  },
  handler(argv) {
    main(argv.id as string)
  },
}
export default downloadCommand

async function main(id: string) {
  await genEpubFor(id)
  await checkEpub(id)
}
