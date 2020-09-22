import cheerio from 'cheerio'
import njk from 'nunjucks'
import prettier from 'prettier'
import _ from 'lodash'
import debugFactory from 'debug'
import {Info} from '../common'
import {ImgSrcInfo} from '../epub-img'

const debug = debugFactory('weread-spy:utils:processContent')
const prettierConfig = require('@magicdawn/prettier-config') as prettier.Options

type TransformImgSrc = (src: string) => string
interface ProcessContentOptions {
  cssFilenames: string[]
  imgSrcInfo: ImgSrcInfo
}

const DATA_ATTR_WHITELIST = ['data-src', 'data-bg-img']

export default function processContent(info: Info, options: ProcessContentOptions) {
  const {chapterContentHtml, chapterContentStyles, currentChapterId} = info
  const {cssFilenames, imgSrcInfo} = options
  debug('processContent for title=%s chapterUid=%s', info.bookInfo.title, currentChapterId)

  let html = chapterContentHtml

  // apply templates
  html = applyTemplate({style: chapterContentStyles, content: html, cssFilenames})

  // new $
  const $ = cheerio.load(html, {decodeEntities: false, xmlMode: true, lowerCaseTags: true})
  // debug('cheerio loaded')

  // remove all data-xxx
  traverse($.root()[0], $, removeDataAttr)
  // debug('removeDataAttr complete')

  // combine span
  traverse($.root()[0], $, removeUnusedSpan)
  // debug('removeUnusedSpan complete')

  // 图片
  const transformImgSrc = (src: string) => imgSrcInfo[src].localFile
  const ctx: {transformImgSrc: TransformImgSrc; imgs: Array<{src: string; newSrc: string}>} = {
    transformImgSrc,
    imgs: [],
  }
  traverse($.root()[0], $, fixImgSrc, ctx)
  // debug('fixImgSrc complete')

  // get xhtml
  html = $.xml().trim()

  // format
  try {
    // html = prettier.format(html, {...prettierConfig, parser: 'html'})
  } catch (e) {
    console.warn('[prettier] format met error: currentChapterId = %s', currentChapterId)
    console.error(e.stack || e)
  }

  // replace
  html = html.replace(/\&nbsp\;/g, ' ')

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

/**
 * get all img srcs
 */

export function getImgSrcs(html: string) {
  // new $
  const $ = cheerio.load(html, {decodeEntities: false, xmlMode: true, lowerCaseTags: true})

  // collect
  const srcs: string[] = []
  traverse($.root()[0], $, collectImgSrc, srcs)

  return srcs
}

// <style>
//   {{ style | safe }}
// </style>
function applyTemplate({
  style,
  content,
  cssFilenames,
}: {
  style: string
  content: string
  cssFilenames: string[]
}) {
  const tpl = `
    <?xml version="1.0" encoding="UTF-8"?>
    <html xmlns="http://www.w3.org/1999/xhtml">
		  <head>
		    <meta charset="UTF-8" />
		    <title>Document</title>
        {%- for css in cssFilenames -%}
        <link rel="stylesheet" href="{{css}}" />
        {%- endfor %}
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
      cssFilenames,
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
      return k.startsWith('data-') && !DATA_ATTR_WHITELIST.includes(k)
    })
    .forEach((attr) => {
      $el.removeAttr(attr)
    })
}

function removeUnusedSpan(el: CheerioElement, $: CheerioStatic): OnNodeResult {
  if (!el.childNodes?.length) {
    return
  }

  const isSimpleTextSpan = (c: CheerioElement) =>
    c.tagName?.toLowerCase() === 'span' && Object.keys(c.attribs || {}).length === 0

  const shouldCombine = el.childNodes.every(isSimpleTextSpan)
  const $el = $(el)
  if (shouldCombine) {
    const text = $el.text()
    $el.empty()
    $el.append(`<span>${text}</span>`)
    return {traverseChildren: false}
  }

  const rate = el.childNodes.filter((c) => !isSimpleTextSpan(c)).length / el.childNodes.length
  if (rate < 1 / 10) {
    const arr: Cheerio[] = []
    let lastIsSimpleTextSpan = true

    for (let c of el.childNodes) {
      if (isSimpleTextSpan(c)) {
        let cur$ = _.last(arr)
        if (cur$ && lastIsSimpleTextSpan) {
          arr[arr.length - 1] = cur$.add(c)
        } else {
          arr.push($(c))
        }
      } else {
        arr.push($(c))
      }
      lastIsSimpleTextSpan = isSimpleTextSpan(c)
    }

    $el.empty()

    for (let cur$ of arr) {
      if (cur$.toArray().every(isSimpleTextSpan)) {
        $el.append(`<span>${cur$.text()}</span>`)
      } else {
        $el.append(cur$)
      }
    }
    return {traverseChildren: false}
  }

  return {traverseChildren: true}
}

/**
 * 收集 img src
 */

function collectImgSrc(el: CheerioElement, $: CheerioStatic, ctx: any): OnNodeResult {
  if (el.tagName?.toLowerCase?.() === 'img') {
    const src = $(el).data('src')
    ;(ctx as string[]).push(src)
  }

  // style="background-image:url(https://res.weread.qq.com/wrepub/web/910419/copyright.jpg);"
  const style = el.attribs?.style
  if (style?.includes('background-image:')) {
    const m = /(?:^|; *?)background-image *?: *?url\(([\S]+?)\)/.exec(style)
    if (m?.[1]) {
      const src = m[1]
      $(el).attr('data-bg-img', src) // mark, has no effect, the result html will be abondoned
      ;(ctx as string[]).push(src)
    }
  }
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
    return
  }

  // style="background-image:url(https://res.weread.qq.com/wrepub/web/910419/copyright.jpg);"
  const style = el.attribs?.style
  if (style?.includes('background-image:')) {
    const m = /(?:^|; *?)background-image *?: *?url\(([\S]+?)\)/.exec(style)
    if (m?.[1]) {
      const $el = $(el)
      const src = m[1]

      // transform
      const newSrc = ctx.transformImgSrc(src)
      ctx.imgs.push({
        src,
        newSrc,
      })

      // replace style
      const newStyle = style.replace(src, newSrc)
      $el.attr('style', newStyle)
    }
  }
}
