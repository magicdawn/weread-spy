import type exampleStartInfo from './example-start-info.json'
import path from 'path'

export type Info = typeof exampleStartInfo
export type BookInfo = typeof exampleStartInfo.bookInfo
export type ChapterInfo = typeof exampleStartInfo.chapterInfos[0]

export interface Data {
  startInfo: Info
  infos: Info[]
}

export const APP_ROOT = path.join(__dirname, '../../')
