#!/usr/bin/env ts-node-script
/* eslint-disable camelcase */

/*
	Produce an EPUB file
	--------------------
	Reference:
		https://www.ibm.com/developerworks/xml/tutorials/x-epubtut/index.html
    https://github.com/danburzo/percollate/blob/master/index.js#L516
 */

import AdmZip from 'adm-zip'
import filenamify from 'filenamify'
import fse from 'fs-extra'
import nunjucks from 'nunjucks'
import path from 'path'
import { performance } from 'perf_hooks'
import { pipeline } from 'stream'
import { baseDebug, BOOKS_DIR, Data, PROJECT_ROOT } from '../common'
import { queryBook } from '../common/books-map'
import Book from './Book'
import getImgSrcInfo from './epub-img'
import epubcheck from './epubcheck'
import { FileItem } from './EpubModel'

// worker
import mapOnWorker from './mapOnWorker'
import { createWorkers } from './processContent/index.main'

// this thread for debugger
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
    fse.readFile(path.join(template_base, 'OEBPS/nav.xhtml'), 'utf8'),
    fse.readFile(path.join(template_base, 'OEBPS/toc.ncx'), 'utf8'),
    fse.readFile(path.join(template_base, 'OEBPS/content.opf'), 'utf8'),
    fse.readFile(path.join(template_base, 'OEBPS/cover.xhtml'), 'utf8'),
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
  if (await fse.pathExists(customCssFile)) {
    extraCss.push('custom.css')
    addFile({ filename: 'custom.css', filepath: customCssFile })
  }

  const DEBUG_PROCESS_CONTENT = !!process.env.DEBUG_PROCESS_CONTENT
  const processContentStart = performance.now()
  let processResults: ReturnType<typeof processContent>[] = []

  //
  // processContent in this thread
  //
  if (DEBUG_PROCESS_CONTENT) {
    processResults = await pmap(
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
  }
  //
  // processContent in multiple threads, via workers
  //
  else {
    const workers = createWorkers()
    processResults = await mapOnWorker(
      chapterInfos,
      async (chapterInfo, i, arr, worker) => {
        const c = chapterInfos[i]
        const { chapterUid } = c
        const cssFilenames = [`css/chapter-${chapterUid}.css`, ...extraCss]
        return await worker.api.processContent(data.infos[i], {
          cssFilenames,
          imgSrcInfo,
        })
      },
      workers
    )
    workers.forEach((w) => w.nodeWorker.unref())
    await new Promise((resolve) => setTimeout(resolve))
  }
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
      content = fse.readFileSync(f.filepath)
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
  const output = fse.createWriteStream(epubFile)
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
  const { title = '' } = (await queryBook({ id })) || {}
  const titleAsFilename = filenamify(title)

  const data = fse.readJsonSync(path.join(BOOKS_DIR, `${id}-${titleAsFilename}.json`))

  let filename = `${titleAsFilename}.epub`
  filename = filename.replace(/（/g, '(').replace(/）/g, ')') // e,g 红楼梦（全集）
  const file = path.join(dir, filename)

  return { data, file, titleAsFilename }
}

export async function genEpubFor(id: string, dir: string, clean: boolean, decompress = false) {
  const { data, file, titleAsFilename } = await getInfo(id, dir)

  await fse.ensureDir(dir)
  await gen({
    epubFile: file,
    data,
    clean,
  })

  if (decompress) {
    const epubUnzipDir = path.join(dir, titleAsFilename + '.epub.d')
    debug('decompress: to %s', epubUnzipDir)
    await fse.ensureDir(epubUnzipDir)
    const zip = new AdmZip(file)
    zip.extractAllTo(epubUnzipDir, true)
  }

  debug('epub created: %s', file)
  return file
}

export async function checkEpub(id: string, dir: string) {
  const { file } = await getInfo(id, dir)
  epubcheck(file)
  return file
}
