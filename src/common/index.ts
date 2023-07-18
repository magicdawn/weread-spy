import { load as $load } from 'cheerio'
import d from 'debug'
import envPaths from 'env-paths'
import $esm from 'esm-utils'
import path from 'path'
import { pkgUpSync } from 'pkg-up'
import { SetOptional } from 'type-fest'

export { $esm }

import type exampleStartInfo from '../utils/processContent/example-start-info.json'
export type Info = SetOptional<
  typeof exampleStartInfo,
  // 旧的是 html: string
  // 新的是 htmlArray: string[]
  'chapterContentHtml' | 'chapterContentHtmlArray'
>

export type BookInfo = Info['bookInfo']
export type ChapterInfo = Info['chapterInfos'][number]

export function getBookHtml(info: Info) {
  // 2021-08-29 出现 chapterContentHtml 为 string[]
  // 2023-06-20 处理多页, chapterContentHtmlArray
  let htmlArray: string[] = []
  if (info.chapterContentHtmlArray) {
    htmlArray = info.chapterContentHtmlArray
  } else if (Array.isArray(info.chapterContentHtml)) {
    htmlArray = info.chapterContentHtml
  } else {
    htmlArray = [info.chapterContentHtml || '']
  }

  const extractUselessWrapper = (fullHtml: string) => {
    // extract content from <html><head></head><body>{content}<body></html>
    const $ = $load(fullHtml, { decodeEntities: false, lowerCaseTags: true })
    if ($('body').length) {
      fullHtml = $('body').html() || ''
    }
    return fullHtml
  }

  const html = htmlArray.map((item) => extractUselessWrapper(item)).join('\n')
  return html
}

export const baseDebug = d('weread-spy')

export interface Data {
  startInfo: Info
  infos: Info[]
}

const closetPkgJson = pkgUpSync({ cwd: __dirname })
if (!closetPkgJson) {
  throw new Error('package.json not found')
}
export const PROJECT_ROOT = path.dirname(closetPkgJson)

/**
 * 通用的数据目录
 * ApplicationSupport/weread-spy
 */

export const APP_SUP_DIR = envPaths('weread-spy', { suffix: '' }).data
export const BOOKS_DIR = path.join(APP_SUP_DIR, 'books')
export const PPTR_DATA_DIR = path.join(APP_SUP_DIR, 'pptr-data')
