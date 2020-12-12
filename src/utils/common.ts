import type exampleStartInfo from './processContent/example-start-info.json'
import path from 'path'

export type Info = typeof exampleStartInfo
export type BookInfo = typeof exampleStartInfo.bookInfo
export type ChapterInfo = typeof exampleStartInfo.chapterInfos[0]

export interface Data {
  startInfo: Info
  infos: Info[]
}

// see https://github.com/vercel/pkg#snapshot-filesystem
export const isPkg = Boolean((process as any).pkg)
export const execDir = path.dirname(process.execPath)

export const PROJECT_ROOT = path.join(__dirname, '../../')

export const APP_ROOT = isPkg
  ? execDir // use exec currentDir
  : PROJECT_ROOT // use projectDir
