/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Command, Option } from 'clipanion'
import delay from 'delay'
import filenamify from 'filenamify'
import fse from 'fs-extra'
import path from 'path'
import * as pptr from 'puppeteer'
import { addBook, queryBook } from '../common/books-map.js'
import { BOOKS_DIR, baseDebug } from '../common/index.js'
import { getBrowser } from '../utils/pptr.js'

const debug = baseDebug.extend('download')

export class DownloadCommand extends Command {
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
    let { url, interval } = this

    if (/^\w+$/.test(url) && !url.includes('/')) {
      // id
      if (/^\d+$/.test(url)) {
        url = (await queryBook({ id: url }))?.url || ''
        if (!url) {
          console.error('url not found for id = %s', url)
          process.exit(1)
        }
      } else {
        url = `https://weread.qq.com/web/bookDetail/${url}`
      }
    }

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

  /**
   * Engine start
   */

  await waitReaderReady(page)
  await subscribeToVuexMutaion(page)

  // save map
  const startInfo = await getInfoFromPage(page)
  await addBook({ id: startInfo.bookId, title: startInfo.bookInfo.title, url: bookReadUrl })

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

  // 先切到 index = 1, 后面会切到 index = 0, 触发 mutation
  await changeChapter(page, startInfo.chapterInfos[1].chapterUid)

  const infos: any[] = []
  for (const [index, c] of startInfo.chapterInfos.entries()) {
    const { chapterUid } = c

    // delay before change chapter
    if (index > 0 && usingInterval) {
      await delay(usingInterval)
    }
    await changeChapter(page, chapterUid)

    const info = await getInfoFromPage(page)
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

/**
 * pptr Actions
 */

export async function waitReaderReady(page: pptr.Page) {
  return page.waitForFunction(
    () => {
      const state = globalThis.app?.__vue__?.$store?.state
      return state?.reader?.chapterContentState === 'DONE'
    },
    { polling: 100 }
  )
}

export async function subscribeToVuexMutaion(page: pptr.Page) {
  await page.evaluate(() => {
    const $store = globalThis.app.__vue__.$store
    $store.subscribe((mutation, state) => {
      console.log('VUEX mutation type=%s', mutation.type, mutation.payload)
      if (mutation.type === 'updateReaderContentHtml') {
        globalThis.__chapterContentHtmlArray__ = mutation.payload
      }
    })
  })
}

export async function changeChapter(page: pptr.Page, uid: number) {
  // start
  await page.$eval(
    '#routerView',
    (el, uid) => {
      ;(el as any).__vue__.changeChapter({ chapterUid: uid })
    },
    uid
  )

  // wait complete
  await waitReaderReady(page)
  await page.waitForFunction(
    (id) => {
      const state = globalThis.app.__vue__.$store.state
      const currentChapterId = state?.reader?.currentChapter?.chapterUid
      const currentState = state?.reader?.chapterContentState
      console.log({ currentChapterId, currentState, id })
      return currentChapterId === id && currentState === 'DONE'
    },
    { polling: 100 },
    uid
  )
}

export async function getInfoFromPage(page: pptr.Page) {
  const { state, chapterContentHtmlArray } = await page.evaluate(() => {
    const state = globalThis.app.__vue__.$store.state
    const chapterContentHtmlArray = globalThis.__chapterContentHtmlArray__
    return { state, chapterContentHtmlArray }
  })
  // want
  const info = {
    bookId: state.reader.bookId,
    bookInfo: state.reader.bookInfo,
    chapterInfos: state.reader.chapterInfos,
    chapterContentHtmlArray: chapterContentHtmlArray, // state.reader.chapterContentHtml,
    chapterContentStyles: state.reader.chapterContentStyles,
    currentChapterId: state.reader.currentChapter.chapterUid,
  }
  return info
}
