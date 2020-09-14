import cheerio from 'cheerio'
import njk from 'nunjucks'
import prettier from 'prettier'
import prettierConfig from '../../prettier.config'

export default function processContent(info: any) {
  const {chapterContentHtml, chapterContentStyles, currentChapterId} = info

  let html = chapterContentHtml

  // apply templates
  html = applyTemplate({style: chapterContentStyles, content: html})

  // new $
  const $ = cheerio.load(html, {decodeEntities: false, xmlMode: true, lowerCaseTags: true})
  const checkArgs: () => [CheerioElement, CheerioStatic] = () => [$.root()[0], $]

  // remove all data-xxx
  traverse($.root()[0], $, removeDataAttr)

  // combine span
  traverse($.root()[0], $, removeUnusedSpan)

  // img
  traverse($.root()[0], $, fixImgSrc)

  // get xhtml
  html = $.xml().trim()

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
		    <meta charset="UTF-8" />
		    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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

type OnNodeResult = {traverseChildren?: boolean} | undefined | void
type OnNode = (el: CheerioElement, $: CheerioStatic) => OnNodeResult

function traverse(el: CheerioElement, $: CheerioStatic, onNode: OnNode) {
  const $el = $(el)

  // self
  const {traverseChildren = true} = onNode(el, $) || {}

  // children
  if (traverseChildren) {
    el.childNodes?.forEach((c) => {
      if (c.type === 'text') return
      traverse(c, $, onNode)
    })
  }
}

function removeDataAttr(el: CheerioElement, $: CheerioStatic): OnNodeResult {
  const $el = $(el)
  Object.keys(el.attribs || {})
    .filter((k) => {
      return k.startsWith('data-') && !['data-src'].includes(k)
    })
    .forEach((attr) => {
      $el.removeAttr(attr)
    })
}

function removeUnusedSpan(el: CheerioElement, $: CheerioStatic): OnNodeResult {
  const shouldCombine =
    el.childNodes?.length &&
    el.childNodes?.every(
      (c) => c.tagName?.toLowerCase() === 'span' && Object.keys(c.attribs || {}).length === 0
    )

  // self
  if (shouldCombine) {
    const $el = $(el)
    const text = $el.text()
    $el.empty()
    $el.append(`<span>${text}</span>`)
  }

  return {traverseChildren: !shouldCombine}
}

function fixImgSrc(el: CheerioElement, $: CheerioStatic): OnNodeResult {
  if (el.tagName?.toLowerCase?.() === 'img') {
    const $el = $(el)
    // const src = $el.data('src')
    // $el.removeAttr('data-src').attr('src', src).attr('alt', src)
    $el.removeAttr('alt')
  }
}
