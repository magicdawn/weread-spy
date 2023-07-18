import { PPTR_DATA_DIR, baseDebug } from '$common'
import pptr from 'puppeteer'
import { RequestInterceptionManager } from 'puppeteer-intercept-and-modify-requests'

const debug = baseDebug.extend('pptr')

function processAppJs(js?: string) {
  debug('modifying app.*.js')

  {
    // 'yes' === _0x16452a['env']['VUE_DISMISS_DEVTOOLS'] && _0x1be68e && (_0x1be68e['__vue__'] = null),
    // 'yes' === _0x16452a['env'][_0x3744('0x22b')] && _0x5ad1f7['$el'] && (console['log']('__vue__'),
    js = (js || '').replace(/'yes' *?=== *?([_\w]+\['env'\])/g, `'yes' !== $1`)
  }

  {
    // vuex
    // this['commit'] = function(_0xe59d72, _0x31227c, _0x3aa954) {
    //     return _0x5068e8['call'](_0x43325a, _0xe59d72, _0x31227c, _0x3aa954);
    // }
    js = js.replace(
      /this\['commit'\]=function\((_0x\w+),(_0x\w+),(_0x[\w]+)\)\{([ \S]+?)\}/,
      (match, arg1, arg2, arg3, functionBody) => {
        return `this['commit'] = function(${arg1}, ${arg2}, ${arg3}) {
          // hook
          const [mutation, payload] = [${arg1}, ${arg2}]
          console.log('injected vuex.commit: ', mutation, payload)
          if (mutation === 'updateReaderContentHtml') {
            window.__chapterContentHtmlArray__ = payload
          }

          ${functionBody}
        }`
      }
    )
  }

  return js
}

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
  await page.goto('https://weread.qq.com/')

  // disable cache
  await page.setCacheEnabled(false)

  // intercept
  const client = await page.target().createCDPSession()
  // @ts-ignore
  const interceptManager = new RequestInterceptionManager(client)
  await interceptManager.intercept({
    urlPattern: `*/app.*.js`,
    resourceType: 'Script',
    modifyResponse({ body }) {
      body = processAppJs(body)
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
