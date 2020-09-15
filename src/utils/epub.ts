#!/usr/bin/env ts-node-script

/*
	Produce an EPUB file
	--------------------
	Reference:
		https://www.ibm.com/developerworks/xml/tutorials/x-epubtut/index.html
    https://github.com/danburzo/percollate/blob/master/index.js#L516
 */

import path from 'path'
import fs from 'fs-extra'
import nunjucks from 'nunjucks'
import archiver from 'archiver'
import fetch from 'node-fetch'
import {launch} from 'puppeteer'
import {v4 as uuidv4} from 'uuid'
import moment from 'moment'

const UA = `percollate/v1.0.0`
const APP_ROOT = path.join(__dirname, '../../')

export async function gen({epubFile, data}) {
  const template_base = path.join(__dirname, 'templates/epub/')

  const output = fs.createWriteStream(epubFile)
  const archive = archiver('zip', {
    store: true,
  })

  output
    .on('close', () => {
      console.log(archive.pointer() + ' total bytes')
      console.log('archiver has been finalized and the output file descriptor has closed.')
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
    })
    .pipe(output)

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

  for (let i = 0; i < chapterInfos.length; i++) {
    const c = chapterInfos[i]
    const {chapterUid} = c

    const cssFilename = `css/chapter-${chapterUid}.css`

    const {xhtml, style, imgs} = processContent(data.chapterInfos[i], {
      cssFilename,
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

    // imgs
  }

  const renderData = {
    e: '',
    title: bookInfo.title,
    uuid: uuidv4(),
    date: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    lang: 'zh-CN',
    assets,
    items,
  }

  // nav.xhtml
  const nav = nunjucks.renderString(navTemplate, renderData)
  archive.append(nav, {name: 'OEBPS/nav.xhtml'})

  // content.opf
  const opf = nunjucks.renderString(opfTemplate, {...renderData})
  archive.append(opf, {name: 'OEBPS/content.opf'})

  const toc = nunjucks.renderString(tocTemplate, renderData)
  archive.append(toc, {name: 'OEBPS/toc.ncx'})

  archive.finalize()
}

import data from '../../data/book/25462428.json'
import processContent from './processContent'
async function main() {
  await gen({
    epubFile: path.join(APP_ROOT, `data/book/${(data as any).startInfo.bookId}.epub`),
    data,
  })
}

main()

// gen
// src/utils/epub.ts

// check
// java -jar ~/Downloads/dev_soft/epubcheck-4.2.4/epubcheck.jar ./data/book/25462428.epub

// 可以生成了
// TODO
//
// 1.图片 Remote resource reference not allowed; resource must be placed in the OCF.
// 远程图片必须列在 content.opf 中
//
// 2. style
// style 不能内联
