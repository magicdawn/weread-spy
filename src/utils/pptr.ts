import { PPTR_DATA_DIR, baseDebug } from '$common'
import path from 'path'
import pptr from 'puppeteer'
import { RequestInterceptionManager } from 'puppeteer-intercept-and-modify-requests'
import { processAppJs } from './pptr-anti-spider/index.js'

const debug = baseDebug.extend('pptr')

export async function getBrowser() {
  const browser = await pptr.launch({
    headless: false,
    devtools: false,
    userDataDir: PPTR_DATA_DIR,
    defaultViewport: null,
    ignoreDefaultArgs: ['--enable-automation'],
  })

  // close existing page
  {
    const pages = await browser.pages()
    process.nextTick(() => {
      pages.forEach((p) => p.close())
    })
  }

  const page = await browser.newPage()

  // disable cache
  await page.setCacheEnabled(false)
  await page.goto('https://weread.qq.com/')

  // intercept
  const client = await page.target().createCDPSession()
  // @ts-ignore
  const interceptManager = new RequestInterceptionManager(client)
  await interceptManager.intercept({
    urlPattern: `*/*.*.js`,
    // urlPattern: `*/app.*.js`,
    resourceType: 'Script',
    modifyResponse({ body, event }) {
      const url = event.request.url
      const basename = path.basename(url)

      // 1.xxx.js
      // app.xxx.js
      // utils.xxx.js
      if (!/^\w+\.\w+\.js$/.test(basename)) {
        return
      }

      body = processAppJs(body, basename)
      return { body }
    },
  })

  const loginBtn = '.navBar_link_Login'
  const logined = await page.$$eval(loginBtn, (els) => els.length === 0)
  if (!logined) {
    // 点击登录
    await page.click(loginBtn)

    // 扫码

    // 等待登录成功
    await page.waitForSelector('.wr_avatar.navBar_avatar', {
      timeout: 0,
    })
    console.log('登录完成')
  }

  const ua = await browser.userAgent()
  console.log('ua = %s', ua)

  return { browser, page }
}
