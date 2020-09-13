#!/usr/bin/env ts-node-script

import pptr from 'puppeteer'
import fse from 'fs-extra'
import path from 'path'
import processContent from './utils/processContent'

const userDataDir = path.join(__dirname, '../data/pptr')

async function main() {
  const browser = await pptr.launch({
    headless: false,
    devtools: false,
    userDataDir,
  })
  const page = await browser.newPage()
  await page.goto('https://weread.qq.com/')

  const loginBtn = '.navBar_link_Login'
  const logined = await page.$$eval(loginBtn, (els) => els.length === 0)
  if (!logined) {
    // 点击登录
    await page.click(loginBtn)

    // 扫码

    // 等待登录成功
    await page.waitForSelector('.wr_avatar.navBar_avatar')
    console.log('登录完成')
  }

  const bookReadUrl = 'https://weread.qq.com/web/reader/9f232de07184869c9f2cc73'
  await page.goto(bookReadUrl)

  const waitCondition = async (test: (el: Element, ...args: any[]) => boolean, ...args: any[]) => {
    let ok = false
    let state = null
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
  const info = {
    bookId: state.reader.bookId,
    bookInfo: state.reader.bookInfo,
    chapterInfos: state.reader.chapterInfos,
    chapterContentHtml: state.reader.chapterContentHtml,
    chapterContentStyles: state.reader.chapterContentStyles,
    currentChapterId: state.reader.currentChapter.chapterUid,
  }

  // raw
  await fse.outputJSON(
    path.join(__dirname, `../data/book/${info.bookId}/00-start-info.json`),
    info,
    {spaces: 2}
  )

  const changeChapter = async (uid) => {
    await page.$eval(
      '#routerView',
      (el, uid) => {
        ;(el as any).__vue__.changeChapter({chapterUid: uid})
      },
      uid
    )
  }

  for (let c of info.chapterInfos) {
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

    const html = await processContent(info)
    const chapterHtmlFile = path.join(
      __dirname,
      `../data/book/${info.bookId}/${info.currentChapterId}.html`
    )
    await fse.outputFile(chapterHtmlFile, html)
  }

  await browser.close()
}
main()

// import startInfo from '../data/book/25462428/00-start-info.json'
// async function test() {
//   console.log(processContent(startInfo))
// }
// test()
