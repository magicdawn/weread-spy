import { Command, Option } from 'clipanion'
import inquirer from 'inquirer'
import _ from 'lodash'
import * as pptr from 'puppeteer'
import URI from 'urijs'
import { baseDebug } from '../common'
import { getBrowser } from '../utils/pptr'
import { main as download } from './download'
import { main as gen } from './gen'

const debug = baseDebug.extend('one')

export default class extends Command {
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
  }
}

async function decideDownload(
  page: pptr.Page,
  browser: pptr.Browser,
  dir?: string,
  interval?: string
) {
  const waitCondition = async (test: (el: Element, ...args: any[]) => boolean, ...args: any[]) => {
    let ok = false
    while (!ok) {
      ok = await page.$eval('#app', test, ...args)
      if (!ok) {
        await new Promise((r) => {
          setTimeout(r, 100)
        })
      }
    }
  }

  await waitCondition((el) => {
    const state = (el as any).__vue__.$store.state
    if (state?.reader?.chapterContentState === 'DONE') {
      return true
    } else {
      return false
    }
  })

  const state = await page.$eval('#app', (el) => {
    const state = (el as any).__vue__.$store.state
    return state
  })

  const chapterInfos = state.reader.chapterInfos
  // why? 不记得了
  // second + first
  const firstChapterUid = chapterInfos[0].chapterUid
  const secondChapterUid = chapterInfos[1].chapterUid

  const changeChapter = async (chapterUid: number) => {
    await page.$eval(
      '#routerView',
      (el: any, chapterUid) => {
        el.__vue__.changeChapter({ chapterUid: chapterUid })
      },
      chapterUid
    )
    await waitCondition((el: any, id) => {
      const state = el.__vue__.$store.state
      const currentChapterId = state.reader.currentChapter.chapterUid
      const currentState = state?.reader?.chapterContentState
      console.log({ currentChapterId, currentState, id })
      return currentChapterId === id && currentState === 'DONE'
    }, chapterUid)
  }

  // to second
  await changeChapter(secondChapterUid)
  // to first
  await changeChapter(firstChapterUid)

  const bookCoverUrl = page.url()

  // download
  await download(bookCoverUrl, { page, browser, interval })
  debug('-'.repeat(20), 'download complete', '-'.repeat(20))

  // generate
  const file = await gen({ url: bookCoverUrl, clean: true, dir })
  debug('-'.repeat(20), 'generate complete', '-'.repeat(20))
  debug('epub 文件: %s', file)
}
