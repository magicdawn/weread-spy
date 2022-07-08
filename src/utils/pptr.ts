import path from 'path'
import pptr from 'puppeteer'
import { APP_SUP_DIR } from './common'

const userDataDir = path.join(APP_SUP_DIR, 'pptr-data')

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
