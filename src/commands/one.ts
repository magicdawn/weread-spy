/* eslint-disable @typescript-eslint/no-explicit-any */

import inquirer from 'inquirer'
import URI from 'urijs'
import pptr from 'puppeteer'
import { Command } from 'clipanion'
import { main as download } from './download'
import { main as gen } from './gen'
import { getBrowser } from '../utils/pptr'

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
    description: 'one station operation',
  })

  static paths = [['one']]

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

        console.log('pageUrl is like a book')
        console.log(pageUrl)
        const title = await page.title()

        // prompt
        prompt = inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `书名: ${title}`,
          },
        ])

        // confirm
        const { confirm } = await prompt
        if (!confirm) return

        // 移除 listener
        page.off('framenavigated', handler)

        // 确认下载
        decideDownload(page, browser)
      }
    }

    page.on('framenavigated', handler)
  }
}

async function decideDownload(page: pptr.Page, browser: pptr.Browser) {
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

  const bookCoverUrl = await page.url()

  // download
  await download(bookCoverUrl, false, { page, browser })
  console.log('-------------------  ')
  console.log()
  console.log('  download complete  ')
  console.log()
  console.log('-------------------  ')

  // generate
  await gen({ url: bookCoverUrl, clean: true })
  console.log('-------------------  ')
  console.log()
  console.log('  generate complete  ')
  console.log()
  console.log('-------------------  ')
}
