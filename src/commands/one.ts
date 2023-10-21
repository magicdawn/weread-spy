import { Command, Option } from 'clipanion'
import inquirer from 'inquirer'
import * as _ from 'lodash-es'
import * as pptr from 'puppeteer'
import URI from 'urijs'
import { baseDebug } from '../common/index.js'
import { getBrowser } from '../utils/pptr.js'
import { changeChapter, main as download, waitReaderReady } from './download.js'
import { genCommandMain as gen } from './gen.js'

const debug = baseDebug.extend('one')

export class OneCommand extends Command {
  static usage = Command.Usage({
    description: '一站式操作, 启动浏览器, 浏览阅读网页, 回到控制台输入 y 开始生成',
  })

  static paths = [['one']]

  dir = Option.String('-d,--dir', {
    description: 'epub 文件输出目录, 默认当前文件夹',
  })

  interval?: string = Option.String('--interval', {
    description: '数字, 切换章节间隔, 单位毫秒',
  })

  async execute() {
    const { browser, page } = await getBrowser()

    let prompt: any

    const handler = async (e: pptr.Frame) => {
      const pageUrl = e.url()
      const uri = URI(pageUrl)
      const path = uri.pathname()
      // if (path.startsWith('/web/bookDetail/')) {
      if (path.startsWith('/web/reader/')) {
        // https://github.com/SBoudrias/Inquirer.js/issues/491#issuecomment-277595658
        // clean prev
        if (prompt) {
          ;(prompt as any).ui.close()
          console.log('')
        }

        const title = await page.title()
        console.log('')
        console.log('当前浏览链接像是一本书:')
        console.log('   [url]: %s', pageUrl)
        console.log(' [title]: %s', title)

        // prompt
        prompt = inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `是否下载: `,
          },
        ])

        // confirm
        const { confirm } = await prompt
        if (!confirm) return

        // 移除 listener
        page.off('framenavigated', handlerDebounced)

        // 确认下载
        decideDownload(page, browser, this.dir, this.interval)
      }
    }

    const handlerDebounced = _.debounce(handler, 1000)
    page.on('framenavigated', handlerDebounced)

    // FIXME: only for dev-test
    // await page.goto('https://weread.qq.com/web/reader/e1932d70813ab82e7g014f5b')
    // await page.goto('https://weread.qq.com/web/reader/f1132f80813ab821eg018540')
  }
}

async function decideDownload(
  page: pptr.Page,
  browser: pptr.Browser,
  dir?: string,
  interval?: string
) {
  await waitReaderReady(page)

  const state = await page.evaluate(() => {
    return globalThis.app.__vue__.$store.state
  })

  const chapterInfos = state.reader.chapterInfos
  // why? 不记得了
  // second + first
  const firstChapterUid = chapterInfos[0].chapterUid
  const secondChapterUid = chapterInfos[1].chapterUid
  // to second
  await changeChapter(page, secondChapterUid)
  // to first
  await changeChapter(page, firstChapterUid)

  const bookCoverUrl = page.url()

  // download
  await download(bookCoverUrl, { page, browser, interval })
  debug('-'.repeat(20), 'download complete', '-'.repeat(20))

  // generate
  const file = await gen({ url: bookCoverUrl, clean: true, dir })
  debug('-'.repeat(20), 'generate complete', '-'.repeat(20))
  debug('epub 文件: %s', file)
}
