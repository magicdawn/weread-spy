import { Page } from 'puppeteer'
import { baseDebug } from '../../common/index'

const debug = baseDebug.extend('utils:anti-spider')

export const HTML_CONTENT_STORAGE_KEY = '__chapterContentHtml__'

export async function hookVuexCommit(page: Page) {
  debug('hookVuexCommit')

  // 注入 $store.commit
  await page.$eval(
    '#app',
    (el: any, htmlContentStorageKey: string) => {
      const original = el.__vue__.$store.commit
      el.__vue__.$store.commit = function (...args: any[]) {
        // action, payload, 第三个参数不知道
        const [action, payload, thirdArg] = args
        console.log('injected vuex.commit: %s %s', action, payload)

        if (action === 'updateReaderContentHtml') {
          globalThis[htmlContentStorageKey] = payload[0]
        }
        return original(...args)
      }
    },
    HTML_CONTENT_STORAGE_KEY
  )
}
