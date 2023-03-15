#!/usr/bin/env ts-node-script
/* eslint-disable camelcase */

/*
	Produce an EPUB file
	--------------------
	Reference:
		https://www.ibm.com/developerworks/xml/tutorials/x-epubtut/index.html
    https://github.com/danburzo/percollate/blob/master/index.js#L516
 */

import filenamify from 'filenamify'
import fs, { ensureDir } from 'fs-extra'
import nunjucks from 'nunjucks'
import path from 'path'
import { performance } from 'perf_hooks'
import { pipeline } from 'stream'
import Book from './Book'
import { baseDebug, BOOKS_DIR, Data, PROJECT_ROOT } from '../common'
import getImgSrcInfo from './epub-img'
import epubcheck from './epubcheck'
import { FileItem } from './EpubModel'
import { queryBook } from '../common/books-map'

// worker
import mapOnWorker from './mapOnWorker'
import { createWorkers } from './processContent/index.main'

// this thread
// debug
import pmap from 'promise.map'
import processContent from './processContent'

const debug = baseDebug.extend('utils:epub')

export async function gen({
  epubFile,
  data,
  clean,
}: {
  epubFile: string
  data: Data
  clean: boolean
}): Promise<void> {
  debug('epubgen %s -> %s', data.startInfo.bookId, epubFile)
  const template_base = path.join(PROJECT_ROOT, 'assets/templates/epub/')

  const book = new Book(data)
  const { bookDir, addFile, addTextFile } = book

  // mimetype file must be first
  book.addZipFile('mimetype', 'application/epub+zip', { compression: 'STORE' })

  // static files from META-INF
  await book.addZipFolder('META-INF', path.join(template_base, 'META-INF'))

  const [navTemplate, tocTemplate, opfTemplate, coverTemplate] = await Promise.all([
    fs.readFile(path.join(template_base, 'OEBPS/nav.xhtml'), 'utf8'),
    fs.readFile(path.join(template_base, 'OEBPS/toc.ncx'), 'utf8'),
    fs.readFile(path.join(template_base, 'OEBPS/content.opf'), 'utf8'),
    fs.readFile(path.join(template_base, 'OEBPS/cover.xhtml'), 'utf8'),
  ])

  // 章节 html
  const { chapterInfos, bookInfo, bookId } = data.startInfo

  // 图片
  const imgSrcInfo = await getImgSrcInfo(book, clean)

  /**
   * cover
   */

  const coverUrl = book.coverUrl
  let coverFileItem: FileItem | undefined // save for manifest.meta.cover
  let coverPageFileItem: FileItem | undefined

  if (book.coverUrl) {
    const { localFile } = imgSrcInfo[coverUrl]
    delete imgSrcInfo[coverUrl]

    // cover img
    coverFileItem = new FileItem({ filename: localFile }) // 内容随 imgs 打包
    addFile(coverFileItem)

    // cover xhtml
    coverPageFileItem = new FileItem({
      filename: 'cover.xhtml',
      content: nunjucks.renderString(coverTemplate, { cover: coverFileItem }),
    })
    book.coverPageFile = coverPageFileItem
  }

  // extra css
  const extraCss: string[] = []
  const customCssFile = path.join(bookDir, 'custom.css')
  if (await fs.pathExists(customCssFile)) {
    extraCss.push('custom.css')
    addFile({ filename: 'custom.css', filepath: customCssFile })
  }

  //
  // processContent in multiple threads, via workers
  //
  // const processContentStart = performance.now()
  // const workers = createWorkers()
  // const processResults = await mapOnWorker(
  //   chapterInfos,
  //   async (chapterInfo, i, arr, worker) => {
  //     const c = chapterInfos[i]
  //     const { chapterUid } = c
  //     const cssFilenames = [`css/chapter-${chapterUid}.css`, ...extraCss]
  //     return await worker.api.processContent(data.infos[i], {
  //       cssFilenames,
  //       imgSrcInfo,
  //     })
  //   },
  //   workers
  // )
  // workers.forEach((w) => w.nodeWorker.unref())
  // await new Promise((resolve) => setTimeout(resolve))
  // debug('processContent cost %s ms', (performance.now() - processContentStart).toFixed())

  //
  // processContent in this thread
  //
  const processContentStart = performance.now()
  const processResults = await pmap(
    chapterInfos,
    async (chapterInfo, i, arr) => {
      const c = chapterInfos[i]
      const { chapterUid } = c
      const cssFilenames = [`css/chapter-${chapterUid}.css`, ...extraCss]
      return processContent(data.infos[i], {
        cssFilenames,
        imgSrcInfo,
      })
    },
    5
  )
  debug('processContent cost %s ms', (performance.now() - processContentStart).toFixed())

  for (let i = 0; i < chapterInfos.length; i++) {
    const c = chapterInfos[i]
    const { chapterUid } = c
    const { xhtml, style } = processResults[i]

    // xhtml
    {
      const filename = `chapter-${chapterUid}.xhtml`
      addTextFile({ filename, content: xhtml })
    }

    // css
    {
      const filename = `css/chapter-${chapterUid}.css`
      addFile({ filename, content: style })
    }
  }

  /**
   * img assets (cover removed)
   */

  for (const src of Object.keys(imgSrcInfo)) {
    const { contentType, localFile, properties } = imgSrcInfo[src]
    addFile({ filename: localFile, properties }) // content will be imgs dir
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
  book.navPageFile = new FileItem({ filename: 'nav.xhtml', properties: 'nav' }) // 内容手动写入
  const { navItems, maxNavDepth } = book.getNavInfo()

  {
    const renderData = { ...baseRenderData, navItems, maxNavDepth }

    const nav = nunjucks.renderString(navTemplate, renderData)
    book.addZipFile('OEBPS/nav.xhtml', nav)

    const toc = nunjucks.renderString(tocTemplate, renderData)
    addFile({ filename: 'toc.ncx', content: toc, id: 'ncx' })
  }

  const manifest = book.getManifest()
  const spine = book.getSpine()
  {
    // content.opf
    const renderData = { ...baseRenderData, manifest, spine }
    const opf = nunjucks.renderString(opfTemplate, renderData)
    book.addZipFile('OEBPS/content.opf', opf)
  }

  // 添加文件
  for (const f of manifest) {
    let content: string | Buffer

    // f.content = '' 也需要写入
    if (typeof f.content !== 'undefined' && f.content !== null) {
      content = f.content
    } else if (f.filepath) {
      content = fs.readFileSync(f.filepath)
    } else {
      continue
    }

    book.addZipFile(`OEBPS/${f.filename}`, content)
  }

  // 添加图片
  await book.addZipFolder('OEBPS/imgs', path.join(bookDir, 'imgs'))

  const stream = book.zip.generateNodeStream({
    streamFiles: true,
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  })
  const output = fs.createWriteStream(epubFile)
  return new Promise((resolve, reject) => {
    pipeline(stream, output, (err) => {
      if (err) {
        return reject(err)
      } else {
        resolve()
      }
    })
  })
}

async function getInfo(id: string, dir: string) {
  let { title = '' } = (await queryBook({ id })) || {}
  title = filenamify(title)

  const data = fs.readJsonSync(path.join(BOOKS_DIR, `${id}-${title}.json`))

  let filename = `${title}.epub`
  filename = filename.replace(/（/g, '(').replace(/）/g, ')') // e,g 红楼梦（全集）
  const file = path.join(dir, filename)

  return { data, file }
}

export async function genEpubFor(id: string, dir: string, clean: boolean) {
  const { data, file } = await getInfo(id, dir)

  await ensureDir(dir)
  await gen({
    epubFile: file,
    data,
    clean,
  })

  debug('epub created: %s', file)
  return file
}

export async function checkEpub(id: string, dir: string) {
  const { file } = await getInfo(id, dir)
  epubcheck(file)
  return file
}
