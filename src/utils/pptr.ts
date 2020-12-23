import pptr from 'puppeteer'
import path from 'path'
import envPaths from 'env-paths'
import {isPkg, execDir, PROJECT_ROOT} from './common'

const appCacheDir = envPaths('weread-spy', {suffix: ''}).cache
const userDataDir = isPkg
  ? path.join(appCacheDir, 'pptr-data')
  : path.join(PROJECT_ROOT, 'data/pptr-data')

export async function getBrowser() {
  const browser = await pptr.launch({
    headless: false,
    devtools: false,
    userDataDir,
    defaultViewport: null,
    executablePath: isPkg
      ? path.join(execDir, 'puppeteer/mac-800071/chrome-mac/Chromium.app/Contents/MacOS/Chromium')
      : undefined,
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

  return {browser, page}
}
