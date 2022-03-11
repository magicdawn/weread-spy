import { createHash } from 'crypto'
import path from 'path'
import debugFactory from 'debug'
import { getImgSrcs } from './processContent'
import pmap from 'promise.map'
import mime from 'mime'
import dl from 'dl-vampire'
import sharp from 'sharp'
import fse from 'fs-extra'
import Book from './Book'

const debug = debugFactory('weread-spy:utils:epub-img')
const md5 = (s: string) => createHash('md5').update(s, 'utf8').digest('hex')

export interface ImgSrcInfo {
  [key: string]: { contentType: string; ext: string; localFile: string; properties?: string }
}

export default async function getImgSrcInfo(book: Book, clean: boolean) {
  let imgSrcInfo: ImgSrcInfo = {}

  const { data, bookDir } = book
  const cacheFile = path.join(bookDir, 'imgs.json')

  if (clean) {
    debug('cleaning: remove imgs.json %s', cacheFile)
    await fse.remove(cacheFile)

    const imgsDir = path.join(bookDir, 'imgs')
    debug('cleaning: remove imgs dir %s', imgsDir)
    await fse.remove(imgsDir)
  } else if (await fse.pathExists(cacheFile)) {
    /**
     * use cache
     */
    imgSrcInfo = await fse.readJsonSync(cacheFile)
    if (Object.keys(imgSrcInfo).length) {
      return imgSrcInfo
    }
  }

  const { chapterInfos } = data.startInfo

  // imgSrcs
  let imgSrcs: string[] = []
  for (let i = 0; i < chapterInfos.length; i++) {
    // 2021-08-29 出现 chapterContentHtml 为 string[]
    let html = data.infos[i].chapterContentHtml
    if (Array.isArray(html)) {
      html = html.join('')
    }
    const curSrcs = getImgSrcs(html)
    imgSrcs = imgSrcs.concat(curSrcs)
  }

  /**
   * img 去重
   */

  const imgSrcSet = new Set()
  const originalImgSrcs = [...imgSrcs]
  imgSrcs = []
  for (const src of originalImgSrcs) {
    if (imgSrcSet.has(src)) {
      continue
    } else {
      imgSrcSet.add(src)
      imgSrcs.push(src)
    }
  }
  debug(
    'imgSrcs collected, length = %s, unique length = %s',
    originalImgSrcs.length,
    imgSrcs.length
  )

  // head contentType is not correct
  // 1.下载
  // 2.识别 & 重命名

  imgSrcs.forEach((src) => {
    let localFile: string
    // https://res.weread.qq.com/wrepub/epub_25462428_587
    const match = /^https?:\/\/res\.weread\.qq\.com\/wrepub\/(epub_[\d\w_-]+)$/.exec(src)
    if (match) {
      const name = match[1]
      localFile = `imgs/${name}`
    } else {
      const hash = md5(src)
      localFile = `imgs/${hash}`
    }

    imgSrcInfo[src] = {
      contentType: '',
      ext: '',
      localFile,
    }
  })

  /**
   * cover
   */

  const coverUrl = book.coverUrl
  if (coverUrl) {
    debug('add cover url = %s', coverUrl)
    imgSrcs.push(coverUrl)
    imgSrcInfo[coverUrl] = {
      contentType: '',
      ext: '',
      localFile: 'imgs/cover', // ext will be add later
      properties: 'cover-image',
    }
  }

  await pmap(
    imgSrcs,
    async (src) => {
      const { localFile } = imgSrcInfo[src]
      const file = path.join(bookDir, localFile)

      // download
      await dl({ url: src, file })

      // 识别
      const buf = await fse.readFile(file)
      const meta = await sharp(buf).metadata()
      const ext = meta.format
      const contentType = mime.getType(ext)

      // attach
      const localFileNew = localFile + '.' + ext
      Object.assign(imgSrcInfo[src], {
        ext,
        contentType,
        localFile: localFileNew,
      })

      // rename
      await fse.rename(path.join(bookDir, localFile), path.join(bookDir, localFileNew))
    },
    10
  )
  debug('download img complete')

  // save cache
  await fse.outputJson(cacheFile, imgSrcInfo, { spaces: 2 })

  return imgSrcInfo
}
