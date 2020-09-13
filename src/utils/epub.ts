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

async function epubgen({epubFile, info}) {
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
  const {chapterInfos, bookInfo, bookId} = info
  for (let c of chapterInfos) {
    const {chapterUid} = c
    const htmlFile = path.join(APP_ROOT, `data/book/25462428/${chapterUid}.html`)
    const content = fs.readFileSync(htmlFile, 'utf8')
    archive.append(content, {name: `OEBPS/chapter-${chapterUid}.xhtml`})
  }

  const assets = [
    {
      id: 'style',
      href: 'style.css',
      mimetype: 'text/css',
    },
  ]

  const data = {
    e: '',
    title: bookInfo.title,
    uuid: uuidv4(),
    date: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    lang: 'zh-CN',
    items: chapterInfos.map((c) => {
      const {chapterUid, title} = c
      return {
        id: 'chapter-' + chapterUid,
        title,
        raw: c,
      }
    }),
  }

  // nav.xhtml
  const nav = nunjucks.renderString(navTemplate, data)
  archive.append(nav, {name: 'OEBPS/nav.xhtml'})

  // content.opf
  const opf = nunjucks.renderString(opfTemplate, {...data})
  archive.append(opf, {name: 'OEBPS/content.opf'})

  const toc = nunjucks.renderString(tocTemplate, data)
  archive.append(toc, {name: 'OEBPS/toc.ncx'})

  archive.finalize()
}

import info from '../../data/book/25462428/00-start-info.json'

async function main() {
  await epubgen({epubFile: path.join(APP_ROOT, `data/book/${info.bookId}.epub`), info})
}

main()

// gen
// src/utils/epub.ts

// check
// java -jar ~/Downloads/dev_soft/epubcheck-4.2.4/epubcheck.jar ./data/book/25462428.epub

// TODO: split weread infos
