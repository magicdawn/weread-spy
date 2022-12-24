import { Command, Option } from 'clipanion'
import inquirer from 'inquirer'
import * as pptr from 'puppeteer'
import URI from 'urijs'
import { baseDebug } from '../common'
import { getBrowser } from '../utils/pptr'
import { main as download } from './download'
import { main as gen } from './gen'

const debug = baseDebug.extend('one')

const EXAMPLE_SHELF_BOOK = {
  bookId: '815123',
  title: '曾国藩家书',
  author: '曾国藩',
  cover: 'https://wfqqreader-1252317822.image.myqcloud.com/cover/123/815123/s_815123.jpg',
  secret: 1,
  format: 'epub',
  soldout: 0,
  payType: 4097,
  finished: 1,
  finishReading: 0,
  lastChapterIdx: 12,
  readUpdateTime: 1602417448,
  updateTime: 1583779409,
  progress: 0,
  updated: 0,
}
type ShelfBook = typeof EXAMPLE_SHELF_BOOK

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

    // 使用 browser goto book readUrl
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

        console.log('当前浏览链接像是一本书')
        console.log(pageUrl)
        const title = await page.title()

        // prompt
        prompt = inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `书名: ${title}, 是否下载: `,
          },
        ])

        // confirm
        const { confirm } = await prompt
        if (!confirm) return

        // 移除 listener
        page.off('framenavigated', handler)

        // 确认下载
        decideDownload(page, browser, this.dir, this.interval)
      }
    }

    page.on('framenavigated', handler)
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

  // want
  const startInfo = {
    bookId: state.reader.bookId,
    bookInfo: state.reader.bookInfo,
    chapterInfos: state.reader.chapterInfos,
    chapterContentHtml: state.reader.chapterContentHtml,
    chapterContentStyles: state.reader.chapterContentStyles,
    currentChapterId: state.reader.currentChapter.chapterUid,
  }

  const changeChapter = async (uid: number) => {
    await page.$eval(
      '#routerView',
      (el, uid) => {
        ;(el as any).__vue__.changeChapter({ chapterUid: uid })
      },
      uid
    )
  }

  const chapterInfos = state.reader.chapterInfos

  const firstChapterUid = chapterInfos[0].chapterUid
  const secondChapterUid = chapterInfos[1].chapterUid

  // to second
  await changeChapter(secondChapterUid)
  await waitCondition((el, id) => {
    const state = (el as any).__vue__.$store.state
    const currentChapterId = state.reader.currentChapter.chapterUid
    const currentState = state?.reader?.chapterContentState
    console.log({ currentChapterId, currentState, id })
    return currentChapterId === id && currentState === 'DONE'
  }, secondChapterUid)

  // to first
  await changeChapter(firstChapterUid)
  await waitCondition((el, id) => {
    const state = (el as any).__vue__.$store.state
    const currentChapterId = state.reader.currentChapter.chapterUid
    const currentState = state?.reader?.chapterContentState
    console.log({ currentChapterId, currentState, id })
    return currentChapterId === id && currentState === 'DONE'
  }, firstChapterUid)

  const bookCoverUrl = page.url()

  // download
  await download(bookCoverUrl, { page, browser, interval })
  debug('-'.repeat(20), 'download complete', '-'.repeat(20))

  // generate
  const file = await gen({ url: bookCoverUrl, clean: true, dir })
  debug('-'.repeat(20), 'generate complete', '-'.repeat(20))
  debug('epub 文件: %s', file)
}
