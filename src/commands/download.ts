/* eslint-disable @typescript-eslint/no-explicit-any */

import fse from 'fs-extra'
import path from 'path'
import pptr from 'puppeteer'
import {Command, Option} from 'clipanion'
import {APP_ROOT} from '../utils/common'
import {getBrowser} from '../utils/pptr'

export default class DownloadCommand extends Command {
  static usage = Command.Usage({
    description: `下载 epub`,
  })

  static paths = [['dl'], ['download']]

  url: string = Option.String('-u,--url', {
    description: 'book url, e.g(https://weread.qq.com/web/reader/9f232de07184869c9f2cc73)',
  })

  justLaunch: boolean = Option.Boolean('--just-launch', {})

  async execute() {
    const url = this.url
    const justLaunch = this.justLaunch

    if (!justLaunch && !url) {
      return console.error('url is required')
    }

    main(url, justLaunch)
  }
}

export async function main(
  bookReadUrl: string,
  justLaunch = false,
  options: {page?: pptr.Page; browser?: pptr.Browser} = {}
) {
  let browser: pptr.Browser
  let page: pptr.Page
  if (options.page && options.browser) {
    ;({browser, page} = options)
  } else {
    ;({browser, page} = await getBrowser())
  }

  // 只是启动浏览器
  if (justLaunch) {
    return
  }

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

  // save map
  const mapFile = path.join(APP_ROOT, 'data/book/map.json')
  let map: any
  try {
    map = fse.readJsonSync(mapFile)
  } catch (error) {
    // noop
  }
  map = {...map, [bookReadUrl]: {bookId: startInfo.bookId, title: startInfo.bookInfo.title}}
  fse.outputJsonSync(mapFile, map, {spaces: 2})

  const changeChapter = async (uid: number) => {
    await page.$eval(
      '#routerView',
      (el, uid) => {
        ;(el as any).__vue__.changeChapter({chapterUid: uid})
      },
      uid
    )
  }

  const infos = []
  for (const c of startInfo.chapterInfos) {
    const {chapterUid} = c

    console.log('before-changeChapter %s', chapterUid)
    await changeChapter(chapterUid)
    await waitCondition((el, id) => {
      const state = (el as any).__vue__.$store.state
      const currentChapterId = state.reader.currentChapter.chapterUid
      const currentState = state?.reader?.chapterContentState
      console.log({currentChapterId, currentState, id})
      return currentChapterId === id && currentState === 'DONE'
    }, chapterUid)
    console.log('after-changeChapter %s', chapterUid)

    const state = await page.$eval('#app', (el) => {
      const state = (el as any).__vue__.$store.state
      return state
    })

    const info = {
      bookId: state.reader.bookId,
      bookInfo: state.reader.bookInfo,
      chapterInfos: state.reader.chapterInfos,
      chapterContentHtml: state.reader.chapterContentHtml,
      chapterContentStyles: state.reader.chapterContentStyles,
      currentChapterId: state.reader.currentChapter.chapterUid,
    }

    infos.push(info)
  }

  // 书籍信息
  const json = {
    startInfo,
    infos,
  }
  await fse.outputJson(path.join(APP_ROOT, `data/book/${startInfo.bookId}.json`), json, {spaces: 2})
  await browser.close()
}
