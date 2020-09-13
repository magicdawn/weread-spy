import cheerio from 'cheerio'
import njk from 'nunjucks'
import prettier from 'prettier'
import prettierConfig from '../../prettier.config'

export default function processContent(info: any) {
  const {chapterContentHtml, chapterContentStyles, currentChapterId} = info

  let html = chapterContentHtml
  const $ = cheerio.load(html, {decodeEntities: false, xmlMode: true})

  const checkArgs: () => [CheerioElement, CheerioStatic] = () => [$.root()[0], $]

  // remove all data-xxx
  removeDataAttr(...checkArgs())

  // combine span
  removeUnusedSpan(...checkArgs())

  // img
  fixImgSrc(...checkArgs())

  // get html
  html = $.html().trim()

  // remove wrapper
  // <html><head></head><body>
  html = html.replace('<html><head></head><body>', '')
  html = html.replace('</body></html>', '')

  // apply templates
  html = applyTemplate({style: chapterContentStyles, content: html})

  // format
  try {
    // html = prettier.format(html, {...prettierConfig, parser: 'html'})
  } catch (e) {
    console.warn('[prettier] format met error: currentChapterId = %s', currentChapterId)
    console.error(e.stack || e)
  }

  return html
}

// <style>
//   {{ style | safe }}
// </style>
function applyTemplate({style, content}: {style: string; content: string}) {
  const tpl = `
    <?xml version="1.0" encoding="UTF-8"?>
    <html xmlns="http://www.w3.org/1999/xhtml">
		  <head>
		    <meta charset="UTF-8"></meta>
		    <meta name="viewport" content="width=device-width, initial-scale=1.0"></meta>
		    <title>Document</title>
		  </head>
		  <body>
		    <div class="readerChapterContent">
		      {{ content | safe }}
		    </div>
		  </body>
		</html>
	`

  const str = njk
    .renderString(tpl, {
      style,
      content,
    })
    .trim()

  return str
}

function removeDataAttr(el: CheerioElement, $: CheerioStatic) {
  const $el = $(el)

  // self
  Object.keys(el.attribs || {})
    .filter((k) => {
      return k.startsWith('data-') && !['data-src'].includes(k)
    })
    .forEach((attr) => {
      $el.removeAttr(attr)
    })

  // children
  el.childNodes?.forEach((c) => {
    if (c.type === 'text') return
    removeDataAttr(c, $)
  })
}

function removeUnusedSpan(el: CheerioElement, $: CheerioStatic) {
  const $el = $(el)

  // self
  const shouldCombine =
    el.childNodes?.length &&
    el.childNodes?.every(
      (el) => el.tagName?.toLowerCase() === 'span' && Object.keys(el.attribs || {}).length === 0
    )
  if (shouldCombine) {
    const text = $el.text()
    $el.empty()
    $el.append(`<span>${text}</span>`)
  } else {
    // children
    ;(el.childNodes || []).forEach((c) => {
      if (c.type === 'text') return
      removeUnusedSpan(c, $)
    })
  }
}

function fixImgSrc(el: CheerioElement, $: CheerioStatic) {
  const $el = $(el)

  // self
  const handleHere = el.tagName?.toLowerCase() === 'img'
  if (handleHere) {
    // const src = $el.data('src')
    // $el.removeAttr('data-src').attr('src', src).attr('alt', src)
    $el.removeAttr('alt')
  } else {
    // children
    el.childNodes?.forEach((c) => {
      if (c.type === 'text') return
      fixImgSrc(c, $)
    })
  }
}
