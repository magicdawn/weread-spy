import d from 'debug'
import envPaths from 'env-paths'
import path from 'path'

import type exampleStartInfo from './processContent/example-start-info.json'
export type Info = typeof exampleStartInfo
export type BookInfo = typeof exampleStartInfo.bookInfo
export type ChapterInfo = typeof exampleStartInfo.chapterInfos[0]

export const baseDebug = d('weread-spy')

export interface Data {
  startInfo: Info
  infos: Info[]
}

export const PROJECT_ROOT = path.join(__dirname, '../../')

/**
 * 通用的数据目录
 * ApplicationSupport/weread-spy
 */

export const APP_SUP_DIR = envPaths('weread-spy', { suffix: '' }).data

export const BOOKS_DIR = path.join(APP_SUP_DIR, 'books')

export const BOOKS_MAP_FILE = path.join(BOOKS_DIR, 'map.json')
