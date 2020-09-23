import pptr from 'puppeteer'
import path from 'path'
import {APP_ROOT} from './common'

const userDataDir = path.join(APP_ROOT, 'data/pptr')

export async function getBrowser() {
  const browser = await pptr.launch({
    headless: false,
    devtools: false,
    userDataDir,
    defaultViewport: null,
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

  const ua = await browser.userAgent()
  console.log('ua = %s', ua)

  return {browser, page}
}
