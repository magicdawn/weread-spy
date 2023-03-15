import d from 'debug'
import envPaths from 'env-paths'
import path from 'path'
import { sync as pkgUpSync } from 'pkg-up'

import type exampleStartInfo from '../utils/processContent/example-start-info.json'
export type Info = typeof exampleStartInfo
export type BookInfo = typeof exampleStartInfo.bookInfo
export type ChapterInfo = (typeof exampleStartInfo.chapterInfos)[0]

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
