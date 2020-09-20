#!/usr/bin/env ts-node-script

/*
	Produce an EPUB file
	--------------------
	Reference:
		https://www.ibm.com/developerworks/xml/tutorials/x-epubtut/index.html
    https://github.com/danburzo/percollate/blob/master/index.js#L516
 */

import path from 'path'
import {execSync} from 'child_process'
import fs from 'fs-extra'
import _ from 'lodash'
import nunjucks from 'nunjucks'
import archiver from 'archiver'
import fetch from 'node-fetch'
import {launch} from 'puppeteer'
import {v4 as uuidv4} from 'uuid'
import moment from 'moment'
import {createHash} from 'crypto'
import pmap from 'promise.map'
import dl from 'dl-vampire'
import filenamify from 'filenamify'
import execa from 'execa'
import mime from 'mime'
import processContent, {getImgSrcs} from './processContent'
import request from './request'
import debugFactory from 'debug'

const debug = debugFactory('weread-spy:utils:epub')
const md5 = (s: string) => createHash('md5').update(s, 'utf8').digest('hex')

const UA = `percollate/v1.0.0`
const APP_ROOT = path.join(__dirname, '../../')

export async function gen({epubFile, data}) {
  debug('epubgen %s -> %s', data.startInfo.bookId, epubFile)
  const template_base = path.join(__dirname, 'templates/epub/')

  const output = fs.createWriteStream(epubFile)
  const archive = archiver('zip', {
    store: true,
  })

  const p = new Promise((resolve, reject) => {
    output
      .on('close', () => {
        console.log(archive.pointer() + ' total bytes')
        console.log('archiver has been finalized and the output file descriptor has closed.')
        resolve()
      })
      .on('end', () => {
        console.log('Data has been drained')
      })

    archive
      .on('warning', (err) => {
        throw err
      })
      .on('error', (err) => {
        throw err
        reject(err)
      })
      .pipe(output)
  })

  // mimetype file must be first
  archive.append('application/epub+zip', {name: 'mimetype'})

  // static files from META-INF
  archive.directory(path.join(template_base, 'META-INF'), 'META-INF')

  const contentTemplate = await fs.readFile(path.join(template_base, 'OEBPS/content.xhtml'), 'utf8')
  const navTemplate = await fs.readFile(path.join(template_base, 'OEBPS/nav.xhtml'), 'utf8')
  const tocTemplate = await fs.readFile(path.join(template_base, 'OEBPS/toc.ncx'), 'utf8')
  const opfTemplate = await fs.readFile(path.join(template_base, 'OEBPS/content.opf'), 'utf8')

  // 章节 html
  const {chapterInfos, bookInfo, bookId} = data.startInfo

  // {
  //   id: 'style',
  //   href: 'style.css',
  //   mimetype: 'text/css',
  // },
  const assets: Array<{id: string; href: string; mimetype: string}> = []

  //     id: `chapter-${chapterUid}-xhtml`,
  //     title,
  //     raw: c,
  //   }
  const items: Array<{id: string; title: string; filename: string}> = []

  // imgSrcs
  let imgSrcs = []
  for (let i = 0; i < chapterInfos.length; i++) {
    const c = chapterInfos[i]
    const curSrcs = getImgSrcs(data.chapterInfos[i].chapterContentHtml)
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

  const imgSrcInfo = {}
  await pmap(
    imgSrcs,
    async (src, index, arr) => {
      const {response} = await request.head(src, {getResponse: true})
      debugger
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const ext = mime.getExtension(contentType)
      let localFile: string

      // https://res.weread.qq.com/wrepub/epub_25462428_587
      const match = /^https?:\/\/res\.weread\.qq\.com\/wrepub\/(epub_[\d\w_-]+)$/.exec(src)
      if (match) {
        const name = match[1]
        localFile = `imgs/${name}.${ext}`
      } else {
        const hash = md5(src)
        localFile = `imgs/${hash}$.{ext}`
      }

      imgSrcInfo[src] = {
        contentType,
        ext,
        localFile,
      }
    },
    20
  )
  debug('imgSrcs contentType fetched')

  for (let i = 0; i < chapterInfos.length; i++) {
    const c = chapterInfos[i]
    const {chapterUid} = c

    const cssFilename = `css/chapter-${chapterUid}.css`
    const transformImgSrc = (src: string) => {
      return imgSrcInfo[src].localFile
    }

    const {xhtml, style} = processContent(data.chapterInfos[i], {
      cssFilename,
      transformImgSrc,
    })

    // xhtml
    {
      const filename = `chapter-${chapterUid}.xhtml`
      archive.append(xhtml, {name: `OEBPS/${filename}`})
      items.push({
        id: `chapter-${chapterUid}-content`,
        title: c.title,
        filename,
      })
    }

    // css
    archive.append(style, {name: `OEBPS/${cssFilename}`})
    assets.push({
      id: `chapter-${chapterUid}-style`,
      href: `css/chapter-${chapterUid}.css`,
      mimetype: 'text/css',
    })
  }

  /**
   * img assets
   */
  for (let src of imgSrcs) {
    const {contentType, localFile} = imgSrcInfo[src]
    assets.push({
      id: localFile.replace(/[\/\.]/g, '-'),
      href: localFile,
      mimetype: contentType,
    })
  }

  /**
   * nav
   */

  const items2 = items.map((item, index) => {
    return {...item, index: index + 1, level: chapterInfos[index].level as number}
  })

  type NavItem = {
    id: string
    title: string
    filename: string
    index: number
    level: number
    children?: NavItem[]
  }

  const navItems: NavItem[] = []
  const startLevel = 1
  for (let i = 0; i < items2.length; i++) {
    const cur = items2[i]

    let arr = navItems
    _.times(cur.level - 1, () => {
      const item = _.last(navItems)
      if (!item.children) item.children = []
      arr = item.children
    })

    arr.push(cur)
  }

  const renderData = {
    e: '',
    title: bookInfo.title,
    uuid: bookId,
    date: new Date(bookInfo.updateTime * 1000).toISOString().replace(/\.\d+Z$/, 'Z'),
    lang: 'zh-CN',
    creator: bookInfo.author,
    publisher: bookInfo.publisher,
    description: bookInfo.intro,
    category: bookInfo.category,
    assets,
    items,
    navItems,
  }

  // nav.xhtml
  const nav = nunjucks.renderString(navTemplate, renderData)
  archive.append(nav, {name: 'OEBPS/nav.xhtml'})

  // content.opf
  const opf = nunjucks.renderString(opfTemplate, {...renderData})
  archive.append(opf, {name: 'OEBPS/content.opf'})

  const toc = nunjucks.renderString(tocTemplate, renderData)
  archive.append(toc, {name: 'OEBPS/toc.ncx'})

  // 下载图片
  const localDir = path.join(APP_ROOT, `data/book/${bookId}/`)
  const imgDir = path.join(localDir, 'imgs')
  const skip = fs.existsSync(imgDir) && fs.readdirSync(imgDir).length === imgSrcs.length
  if (!skip) {
    await pmap(
      imgSrcs,
      (src, index, arr) => {
        const {localFile} = imgSrcInfo[src]
        console.log('handle img %s -> %s', src, localFile)
        return dl({url: src, file: path.join(localDir, localFile)})
      },
      10
    )
  }
  archive.directory(path.join(localDir, 'imgs'), 'OEBPS/imgs')

  archive.finalize()

  return p
}

function getInfo(id: string) {
  const data = fs.readJsonSync(path.join(APP_ROOT, `data/book/${id}.json`))
  let filename: string
  filename = (data as any).startInfo.bookInfo.title
  filename = filenamify(filename)
  filename = filename.replace(/（/g, '(').replace(/）/g, ')') // e,g 红楼梦（全集）
  const file = path.join(APP_ROOT, `data/book/${filename}.epub`)

  return {data, file}
}

export async function genEpubFor(id: string) {
  const {data, file} = getInfo(id)
  await gen({
    epubFile: file,
    data,
  })
}

export async function checkEpub(id: string) {
  const {data, file} = getInfo(id)
  const epubcheckJar = path.join(APP_ROOT, 'assets/epubcheck.jar')

  const cmd = `java -jar ${epubcheckJar} '${file}'`
  console.log('[exec]: %s', cmd)
  execa.commandSync(cmd, {stdio: 'inherit', shell: true})
}

// check
// java -jar ~/Downloads/dev_soft/epubcheck-4.2.4/epubcheck.jar ./data/book/25462428.epub

/**
 *
 * TODO
 * - toc 层级, 做了在 iBook 看不出效果
 * - 字体优化, 现在太难看了
 *
 * 优化
 * - 样式合并
 * - processContent 使用 worker + comlink, 加快速度
 * - 图片加快速度, 本地存一个 hash 列表, 不使用 head check
 * - 图片大小压缩, 现在很大.
 */
