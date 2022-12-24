import path from 'path'
import pptr from 'puppeteer'
import { RequestInterceptionManager } from 'puppeteer-intercept-and-modify-requests'
import { APP_SUP_DIR, baseDebug } from '../common'

const debug = baseDebug.extend('pptr')
const userDataDir = path.join(APP_SUP_DIR, 'pptr-data')

function processAppJs(js: string) {
  // 'yes' === _0x16452a['env']['VUE_DISMISS_DEVTOOLS'] && _0x1be68e && (_0x1be68e['__vue__'] = null),
  // 'yes' === _0x16452a['env'][_0x3744('0x22b')] && _0x5ad1f7['$el'] && (console['log']('__vue__'),
  return js.replace(/\'yes\' *?=== *?([_\w]+\['env'\])/g, `'yes' !== $1`)
}

export async function getBrowser() {
  const browser = await pptr.launch({
    headless: false,
    devtools: false,
    userDataDir,
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
  await page.goto('https://weread.qq.com/')

  // disable cache
  await page.setCacheEnabled(false)

  // intercept
  const client = await page.target().createCDPSession()
  const interceptManager = new RequestInterceptionManager(client)
  await interceptManager.intercept({
    urlPattern: `*/app.*.js`,
    resourceType: 'Script',
    modifyResponse({ body }) {
      debug('current enable __vue__ prop attach')
      body = processAppJs(body)
      return { body: body }
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
