'epub-bak.ts'
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
import mimetype from 'mimetype'
import archiver from 'archiver'
import fetch from 'node-fetch'
import {launch} from 'puppeteer'

const UA = `percollate/v1.0.0`

async function epubgen(data, output_path, options) {
  const template_base = path.join(__dirname, 'templates/epub/')

  const output = fs.createWriteStream(output_path)
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

  archive.append(data.style || '', {name: 'OEBPS/style.css'})

  let remoteResources = []
  data.items.forEach((item) => {
    remoteResources = remoteResources.concat(item.remoteResources || [])
    let item_content = nunjucks.renderString(contentTemplate, {
      ...data,
      item,
    })
    archive.append(item_content, {name: `OEBPS/${item.id}.xhtml`})
  })

  for (let i = 0; i < remoteResources.length; i++) {
    let entry = remoteResources[i]
    try {
      if (options.debug) {
        console.log(`Fetching: ${entry[0]}\n`)
      }
      let stream = (
        await fetch(entry[0], {
          headers: {
            'user-agent': UA,
          },
          timeout: 10 * 1000,
        })
      ).body
      archive.append(stream, {name: `OEBPS/${entry[1]}`})
    } catch (err) {
      console.log(err)
    }
  }

  const assets = [
    {
      id: 'style',
      href: 'style.css',
      mimetype: 'text/css',
    },
  ]

  // if (data.cover) {
  //   const COVER_TEMPLATE = path.join(__dirname, 'templates/cover.html')
  //   const cover_html = nunjucks.renderString(await fs.readFile(COVER_TEMPLATE, 'utf8'), data)
  //
  //   const browser = await launch(options, {
  //     width: 400,
  //     height: 565,
  //   })
  //   const page = await browser.newPage()
  //
  //   await page.setUserAgent(UA)
  //   await page.setContent(cover_html, {waitUntil: 'load'})
  //
  //   let buff = await page.screenshot({
  //     type: 'png',
  //     fullPage: true,
  //   })
  //
  //   archive.append(buff, {name: 'OEBPS/cover.png'})
  //
  //   await browser.close()
  // }

  const nav = nunjucks.renderString(navTemplate, data)
  const opf = nunjucks.renderString(opfTemplate, {
    ...data,
    assets,
    cover: data.cover
      ? {
          id: 'cover',
          href: 'cover.png',
          mimetype: 'image/png',
        }
      : undefined,
    remoteResources: remoteResources.map((entry) => ({
      id: entry[1].replace(/[^a-z0-9]/gi, ''),
      href: entry[1],
      mimetype: mimetype.lookup(entry[1]),
    })),
  })

  const toc = nunjucks.renderString(tocTemplate, data)

  archive.append(nav, {name: 'OEBPS/nav.xhtml'})
  archive.append(opf, {name: 'OEBPS/content.opf'})
  archive.append(toc, {name: 'OEBPS/toc.ncx'})

  archive.finalize()
}
