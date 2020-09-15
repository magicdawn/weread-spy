import cheerio from 'cheerio'
import njk from 'nunjucks'
import prettier from 'prettier'
import prettierConfig from '../../prettier.config'

type TransformImgSrc = (src: string) => string

interface ProcessContentOptions {
  cssFilename: string
  transformImgSrc: TransformImgSrc
}

export default function processContent(info: any, options: ProcessContentOptions) {
  const {chapterContentHtml, chapterContentStyles, currentChapterId} = info
  const {cssFilename, transformImgSrc} = options

  let html = chapterContentHtml

  // apply templates
  html = applyTemplate({style: chapterContentStyles, content: html, cssFilename})

  // new $
  const $ = cheerio.load(html, {decodeEntities: false, xmlMode: true, lowerCaseTags: true})
  const checkArgs: () => [CheerioElement, CheerioStatic] = () => [$.root()[0], $]

  // remove all data-xxx
  traverse($.root()[0], $, removeDataAttr)

  // combine span
  traverse($.root()[0], $, removeUnusedSpan)

  // 图片
  const ctx: {transformImgSrc: TransformImgSrc; imgs: Array<{src: string; newSrc: string}>} = {
    transformImgSrc,
    imgs: [],
  }
  traverse($.root()[0], $, fixImgSrc, ctx)

  // get xhtml
  html = $.xml().trim()

  // format
  try {
    // html = prettier.format(html, {...prettierConfig, parser: 'html'})
  } catch (e) {
    console.warn('[prettier] format met error: currentChapterId = %s', currentChapterId)
    console.error(e.stack || e)
  }

  let style = chapterContentStyles
  try {
    style = prettier.format(style, {...prettierConfig, parser: 'css'})
  } catch (e) {
    console.warn('[prettier] format met error: currentChapterId = %s', currentChapterId)
    console.error(e.stack || e)
  }

  return {
    xhtml: html,
    style,
    imgs: ctx.imgs,
  }
}

// <style>
//   {{ style | safe }}
// </style>
function applyTemplate({
  style,
  content,
  cssFilename,
}: {
  style: string
  content: string
  cssFilename: string
}) {
  const tpl = `
    <?xml version="1.0" encoding="UTF-8"?>
    <html xmlns="http://www.w3.org/1999/xhtml">
		  <head>
		    <meta charset="UTF-8" />
		    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
		    <title>Document</title>
        <link rel="stylesheet" href="{{cssFilename}}" />
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
      cssFilename,
    })
    .trim()

  return str
}

type OnNodeResult = {traverseChildren?: boolean} | undefined | void
type OnNode = (el: CheerioElement, $: CheerioStatic, extraData?: any) => OnNodeResult

function traverse(el: CheerioElement, $: CheerioStatic, onNode: OnNode, extraData?: any) {
  const $el = $(el)

  // self
  const {traverseChildren = true} = onNode(el, $, extraData) || {}

  // children
  if (traverseChildren) {
    el.childNodes?.forEach((c) => {
      if (c.type === 'text') return
      traverse(c, $, onNode, extraData)
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

function fixImgSrc(el: CheerioElement, $: CheerioStatic, ctx: any): OnNodeResult {
  if (el.tagName?.toLowerCase?.() === 'img') {
    const $el = $(el)
    const src = $el.data('src')

    // remove alt
    $el.removeAttr('alt')

    // transform
    const newSrc = ctx.transformImgSrc(src)
    ctx.imgs.push({
      src,
      newSrc,
    })

    // change src
    $el.attr('src', newSrc)
  }
}
