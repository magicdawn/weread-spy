#!/usr/bin/env ts-node-script

/*
	Produce an EPUB file
	--------------------
	Reference:
		https://www.ibm.com/developerworks/xml/tutorials/x-epubtut/index.html
    https://github.com/danburzo/percollate/blob/master/index.js#L516
 */

import path from 'path'
import {performance} from 'perf_hooks'
import fs from 'fs-extra'
import _ from 'lodash'
import nunjucks from 'nunjucks'
import archiver from 'archiver'
import pmap from 'promise.map'
import filenamify from 'filenamify'
import execa from 'execa'
import debugFactory from 'debug'
import {Data, APP_ROOT} from './common'
import getImgSrcInfo from './epub-img'
import {createWorker, createWorkers} from './processContent/index.main'
import mapOnWorker from './mapOnWorker'
import {FileItem, FileItemFields} from './EpubModel'
import Book from './Book'

const debug = debugFactory('weread-spy:utils:epub')

export async function gen({epubFile, data}: {epubFile: string; data: Data}) {
  debug('epubgen %s -> %s', data.startInfo.bookId, epubFile)
  const template_base = path.join(APP_ROOT, 'assets/templates/epub/')

  const book = new Book(data)
  const {bookDir, addFile, addTextFile} = book

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

  const [navTemplate, tocTemplate, opfTemplate, coverTemplate] = await Promise.all([
    fs.readFile(path.join(template_base, 'OEBPS/nav.xhtml'), 'utf8'),
    fs.readFile(path.join(template_base, 'OEBPS/toc.ncx'), 'utf8'),
    fs.readFile(path.join(template_base, 'OEBPS/content.opf'), 'utf8'),
    fs.readFile(path.join(template_base, 'OEBPS/cover.xhtml'), 'utf8'),
  ])

  // 章节 html
  const {chapterInfos, bookInfo, bookId} = data.startInfo

  // 图片信息
  const imgSrcInfo = await getImgSrcInfo(book)

  /**
   * cover
   */

  const coverUrl = book.coverUrl
  let coverFileItem: FileItem // save for manifest.meta.cover
  let coverPageFileItem: FileItem

  if (book.coverUrl) {
    const {localFile, contentType} = imgSrcInfo[coverUrl]
    delete imgSrcInfo[coverUrl]

    // cover img
    coverFileItem = new FileItem({filename: localFile}) // 内容随 imgs 打包
    addFile(coverFileItem)

    // cover xhtml
    coverPageFileItem = new FileItem({
      filename: 'cover.xhtml',
      content: nunjucks.renderString(coverTemplate, {cover: coverFileItem}),
    })
    book.coverPageFile = coverPageFileItem
  }

  // extra css
  const extraCss = []
  const customCssFile = path.join(bookDir, 'custom.css')
  if (await fs.pathExists(customCssFile)) {
    extraCss.push('custom.css')
    addFile({filename: 'custom.css', filepath: customCssFile})
  }

  const processContentStart = performance.now()
  const workers = createWorkers()
  const processResults = await mapOnWorker(
    chapterInfos,
    async (chapterInfo, i, arr, worker) => {
      const c = chapterInfos[i]
      const {chapterUid} = c
      const cssFilenames = [`css/chapter-${chapterUid}.css`, ...extraCss]
      return await worker.api.processContent(data.infos[i], {
        cssFilenames,
        imgSrcInfo,
      })
    },
    workers
  )
  debug('processContent cost %s ms', (performance.now() - processContentStart).toFixed())
  workers.forEach((w) => w.nodeWorker.unref())

  for (let i = 0; i < chapterInfos.length; i++) {
    const c = chapterInfos[i]
    const {chapterUid} = c
    const {xhtml, style} = processResults[i]

    // xhtml
    {
      const filename = `chapter-${chapterUid}.xhtml`
      addTextFile({filename, content: xhtml})
    }

    // css
    {
      const filename = `css/chapter-${chapterUid}.css`
      addFile({filename, content: style})
    }
  }

  /**
   * img assets (cover removed)
   */

  for (let src of Object.keys(imgSrcInfo)) {
    const {contentType, localFile, properties} = imgSrcInfo[src]
    addFile({filename: localFile, properties}) // content will be imgs dir
  }

  const baseRenderData = {
    bookId,
    e: '',
    title: bookInfo.title,
    date: new Date(bookInfo.updateTime * 1000).toISOString().replace(/\.\d+Z$/, 'Z'),
    lang: 'zh-CN',
    creator: bookInfo.author,
    publisher: bookInfo.publisher,
    description: bookInfo.intro,
    category: bookInfo.category,

    // cover
    cover: coverFileItem,
    coverPage: coverPageFileItem,
  }

  /**
   * nav
   */

  // add nav.xhtml first
  book.navPageFile = new FileItem({filename: 'nav.xhtml', properties: 'nav'}) // 内容手动写入
  const {navItems, maxNavDepth} = book.getNavInfo()

  {
    const renderData = {...baseRenderData, navItems, maxNavDepth}

    const nav = nunjucks.renderString(navTemplate, renderData)
    archive.append(nav, {name: 'OEBPS/nav.xhtml'}) //

    const toc = nunjucks.renderString(tocTemplate, renderData)
    addFile({filename: 'toc.ncx', content: toc, id: 'ncx'})
  }

  const manifest = book.getManifest()
  const spine = book.getSpine()
  {
    // content.opf
    const renderData = {...baseRenderData, manifest, spine}
    const opf = nunjucks.renderString(opfTemplate, renderData)
    archive.append(opf, {name: 'OEBPS/content.opf'})
  }

  // 添加文件
  for (let f of manifest) {
    if (!f.content && !f.filepath) continue

    let content = f.content
    if (!content) {
      content = fs.readFileSync(f.filepath)
    }

    archive.append(content, {name: `OEBPS/${f.filename}`})
  }

  // 添加图片
  archive.directory(path.join(bookDir, 'imgs'), 'OEBPS/imgs')

  archive.finalize()
  return p
}

function getInfo(id: string) {
  const data = fs.readJsonSync(path.join(APP_ROOT, `data/book/${id}.json`))
  let filename: string
  filename = (data as Data).startInfo.bookInfo.title
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
  try {
    execa.commandSync(cmd, {stdio: 'inherit', shell: true})
  } catch (error) {
    // ignore
  }
}

// check
// java -jar ~/Downloads/dev_soft/epubcheck-4.2.4/epubcheck.jar ./data/book/25462428.epub

/**
 * - toc 层级, 做了在 iBook 看不出效果, clearview 有效果
 *
 * - processContent 使用 worker + comlink, 加快速度
 * 不使用
 * processContent cost 127512 ms
 * weread-spy gen -u https://weread.qq.com/web/reader/41432f705de453414ca0b4akc81322c012c81e728d9d180
 * 使用 60+s
 *
 * 字体优化, 现在太难看了
 * 下载汉仪旗黑字体, 使用默认样式挺好, 另支持自定义 css
 *
 * - 样式合并
 * 多页样式不一样
 *
 * - 图片大小压缩, 现在很大.
 * TODO
 *
 * 支持 css background-image
 * TODO 现在 check 会报错
 */
