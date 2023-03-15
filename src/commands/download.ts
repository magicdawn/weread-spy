/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Command, Option } from 'clipanion'
import delay from 'delay'
import filenamify from 'filenamify'
import fse from 'fs-extra'
import path from 'path'
import * as pptr from 'puppeteer'
import { baseDebug, BOOKS_DIR } from '../common'
import { addBook } from '../common/books-map'
import { getBrowser } from '../utils/pptr'

const debug = baseDebug.extend('download')

export default class DownloadCommand extends Command {
  static usage = Command.Usage({
    description: `下载 epub`,
  })

  static paths = [['dl'], ['download']]

  url: string = Option.String('-u,--url', {
    description: 'book url, e.g(https://weread.qq.com/web/reader/9f232de07184869c9f2cc73)',
    required: true,
  })

  interval?: string = Option.String('--interval', {
    description: '数字, 切换章节间隔, 单位毫秒',
  })

  async execute() {
    const { url, interval } = this
    main(url, { interval })
  }
}

export async function main(
  bookReadUrl: string,
  options: { page?: pptr.Page; browser?: pptr.Browser; interval?: number | string } = {}
) {
  // create if not provided
  if (!options.page || !options.browser) {
    Object.assign(options, await getBrowser())
  }
  const browser = options.browser!
  const page = options.page!

  await page.goto(bookReadUrl)

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
    return state?.reader?.chapterContentState === 'DONE'
  })

  async function getInfoFromPage() {
    const { state, chapterContentHtml } = await page.$eval('#app', (el) => {
      const state = (el as any).__vue__.$store.state
      const chapterContentHtml = globalThis.__chapterContentHtml__
      return { state, chapterContentHtml }
    })

    // want
    const info = {
      bookId: state.reader.bookId,
      bookInfo: state.reader.bookInfo,
      chapterInfos: state.reader.chapterInfos,
      chapterContentHtml: chapterContentHtml || state.reader.chapterContentHtml,
      chapterContentStyles: state.reader.chapterContentStyles,
      currentChapterId: state.reader.currentChapter.chapterUid,
    }
    return info
  }

  const startInfo = await getInfoFromPage()

  // save map
  await addBook({ id: startInfo.bookId, title: startInfo.bookInfo.title, url: bookReadUrl })

  const changeChapter = async (uid: number) => {
    await page.$eval(
      '#routerView',
      (el, uid) => {
        ;(el as any).__vue__.changeChapter({ chapterUid: uid })
      },
      uid
    )
  }

  let usingInterval: number | undefined = undefined
  if (options.interval) {
    if (typeof options.interval === 'number') {
      usingInterval = options.interval
    }
    if (typeof options.interval === 'string') {
      usingInterval = Number(options.interval)
      if (isNaN(usingInterval)) {
        throw new Error('expect a number for --interval')
      }
    }
  }
  if (usingInterval) {
    debug('切换章节间隔 %s ms', usingInterval)
  }

  const infos: any[] = []
  for (const [index, c] of startInfo.chapterInfos.entries()) {
    const { chapterUid } = c

    // delay before change chapter
    if (index > 0 && usingInterval) {
      await delay(usingInterval)
    }
    await changeChapter(chapterUid)

    await waitCondition((el, id) => {
      const state = (el as any).__vue__.$store.state
      const currentChapterId = state.reader.currentChapter.chapterUid
      const currentState = state?.reader?.chapterContentState
      console.log({ currentChapterId, currentState, id })
      return currentChapterId === id && currentState === 'DONE'
    }, chapterUid)

    const info = await getInfoFromPage()
    infos.push(info)
    debug('已收集章节 id=%s', chapterUid)
  }

  // 书籍信息
  const json = {
    startInfo,
    infos,
  }

  const {
    bookId,
    bookInfo: { title },
  } = startInfo
  const bookJsonFile = path.join(BOOKS_DIR, filenamify(`${bookId}-${title}.json`))
  await fse.outputJson(bookJsonFile, json, {
    spaces: 2,
  })

  debug('book id = %s url = %s', bookId, bookReadUrl)
  debug('downloaded to %s', bookJsonFile)

  await browser.close()
}
