import {createHash} from 'crypto'
import path from 'path'
import debugFactory from 'debug'
import {getImgSrcs} from './processContent'
import pmap from 'promise.map'
import mime from 'mime'
import dl from 'dl-vampire'
import request from './request'
import {Data, APP_ROOT} from './common'
import sharp from 'sharp'
import fse from 'fs-extra'

const debug = debugFactory('weread-spy:utils:epub-img')
const md5 = (s: string) => createHash('md5').update(s, 'utf8').digest('hex')

export default async function getImgSrcInfo(data: Data) {
  let imgSrcInfo: {
    [key: string]: {contentType: string; ext: string; localFile: string}
  } = {}

  const bookDir = path.join(APP_ROOT, `data/book/${data.startInfo.bookId}/`)
  const cacheFile = path.join(bookDir, 'imgs.json')

  /**
   * use cache
   */

  if (await fse.pathExists(cacheFile)) {
    imgSrcInfo = await fse.readJsonSync(cacheFile)
    if (Object.keys(imgSrcInfo).length) {
      return imgSrcInfo
    }
  }

  const {chapterInfos} = data.startInfo

  // imgSrcs
  let imgSrcs: string[] = []
  for (let i = 0; i < chapterInfos.length; i++) {
    const c = chapterInfos[i]
    const curSrcs = getImgSrcs(data.infos[i].chapterContentHtml)
    imgSrcs = imgSrcs.concat(curSrcs)
  }

  /**
   * img 去重
   */

  let imgSrcSet = new Set()
  const originalImgSrcs = [...imgSrcs]
  imgSrcs = []
  for (let src of originalImgSrcs) {
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

  await pmap(
    imgSrcs,
    async (src) => {
      const {localFile} = imgSrcInfo[src]
      const file = path.join(bookDir, localFile)

      // download
      await dl({url: src, file})

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
  await fse.outputJson(cacheFile, imgSrcInfo, {spaces: 2})

  return imgSrcInfo
}
