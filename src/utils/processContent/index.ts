/* eslint-disable @typescript-eslint/no-var-requires */

import { $esm, Info, getBookHtml } from '$common'
import type { AnyNode as $AnyNode, Element as $Element, Cheerio, CheerioAPI } from 'cheerio'
import { load as $load } from 'cheerio'
import debugFactory from 'debug'
import * as _ from 'lodash-es'
import njk from 'nunjucks'
import prettier from 'prettier'
import { ImgSrcInfo } from '../epub-img.js'

const debug = debugFactory('weread-spy:utils:processContent')
const { require } = $esm(import.meta)
const prettierConfig = require('@magicdawn/prettier-config') as prettier.Options

type TransformImgSrc = (src: string) => string
interface ProcessContentOptions {
  cssFilenames: string[]
  imgSrcInfo: ImgSrcInfo
}

const DATA_ATTR_WHITELIST = ['data-src', 'data-bg-img']

export default async function processContent(info: Info, options: ProcessContentOptions) {
  const { chapterContentHtml, chapterContentStyles, currentChapterId } = info
  const { cssFilenames, imgSrcInfo } = options
  debug('processContent for title=%s chapterUid=%s', info.bookInfo.title, currentChapterId)

  let html = getBookHtml(info)

  // apply templates
  html = applyTemplate({ style: chapterContentStyles, content: html, cssFilenames })

  // new $
  const $ = $load(html, {
    // @ts-ignore
    _useHtmlParser2: true,
    decodeEntities: false,
    lowerCaseTags: true,
  })
  // debug('cheerio loaded')

  // remove all data-xxx
  traverse($.root()[0], $, removeDataAttr)
  // debug('removeDataAttr complete')
  // debug($.xml().trim())

  // combine span
  traverse($.root()[0], $, combineTextSpan)
  // debug('removeUnusedSpan complete')
  // debug($.xml().trim())

  /**
   * special cases
   */

  // <p class="fDropContent"><span class="ftext"><span>在</span></span><span>我的第一本书《练习的心态》中
  // 显示效果差
  $('.fDropContent > .ftext').removeClass('ftext').data('removed-class', 'ftext')

  // 图片
  const transformImgSrc = (src: string) => imgSrcInfo[src]?.localFile
  const ctx: { transformImgSrc: TransformImgSrc; imgs: Array<{ src: string; newSrc: string }> } = {
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
    console.warn(e.stack || e)
  }

  // replace
  html = html.replace(/&nbsp;/g, ' ')

  let style = chapterContentStyles
  try {
    style = await prettier.format(style, { ...prettierConfig, parser: 'css' })
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
  const $ = $load(html, { decodeEntities: false, xmlMode: true, lowerCaseTags: true })

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

type OnNodeResult = { traverseChildren?: boolean } | undefined | void
type OnNode = (el: $AnyNode, $: CheerioAPI, extraData?: any) => OnNodeResult

function traverse(el: $AnyNode, $: CheerioAPI, onNode: OnNode, extraData?: any) {
  // self
  const { traverseChildren = true } = onNode(el, $, extraData) || {}

  // children
  if (traverseChildren && (el.type === 'tag' || el.type === 'root')) {
    el.childNodes.forEach((c) => {
      if (c.type === 'text') return
      traverse(c, $, onNode, extraData)
    })
  }
}

function removeDataAttr(el: $Element, $: CheerioAPI): OnNodeResult {
  const $el = $(el)
  if (el.type === 'tag') {
    Object.keys(el.attribs || {})
      .filter((k) => {
        return k.startsWith('data-') && !DATA_ATTR_WHITELIST.includes(k)
      })
      .forEach((attr) => {
        $el.removeAttr(attr)
      })
  }
}

function combineTextSpan(el: $Element, $: CheerioAPI): OnNodeResult {
  if (el.type !== 'tag') return
  if (!el.childNodes?.length) {
    return
  }

  const isSimpleTextSpan = (c: $AnyNode) =>
    c.type === 'tag' &&
    c.tagName?.toLowerCase() === 'span' &&
    Object.keys((c as $Element).attribs || {}).length === 0

  if (isSimpleTextSpan(el)) {
    return { traverseChildren: false }
  }

  const $el = $(el)
  const shouldCombine = el.childNodes.every(isSimpleTextSpan)
  if (shouldCombine) {
    const text = $el.text()
    $el.empty()
    $el.append(`<span>${text}</span>`)
    return { traverseChildren: false }
  }

  const rate = el.childNodes.filter((c) => !isSimpleTextSpan(c)).length / el.childNodes.length
  if (rate < 1 / 10) {
    const arr: Cheerio<$AnyNode>[] = []
    let lastIsSimpleTextSpan = true

    for (const c of el.childNodes) {
      if (isSimpleTextSpan(c)) {
        const cur$ = _.last(arr)
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

    for (const cur$ of arr) {
      if (cur$.toArray().every(isSimpleTextSpan)) {
        $el.append(`<span>${cur$.text()}</span>`)
      } else {
        $el.append(cur$)
      }
    }

    return { traverseChildren: true }
  }

  return { traverseChildren: true }
}

/**
 * 收集 img src
 */

const CLASS_FOOTNOTE = 'qqreader-footnote'

function collectImgSrc(el: $Element, $: CheerioAPI, ctx: string[]): OnNodeResult {
  if (el.type === 'tag' && el.tagName?.toLowerCase?.() === 'img') {
    const $el = $(el)

    // 不处理这种脚注
    // <img
    //  data-wr-co=\"5445\"
    //  alt=\"敲西瓜。日本的小孩在夏天常玩的游戏。小孩蒙着眼，手拿棍子，比赛谁先可以把西瓜敲碎。\"
    //  class=\"qqreader-footnote\"
    //  src =\"data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==\"
    //  data-src=\"../Images/note.png\"
    // />
    if ($el.hasClass(CLASS_FOOTNOTE)) {
      return
    }

    const src = ($el.data('src') as string | undefined) || $el.attr('src')
    if (src) {
      ctx.push(src)
    }
  }

  // style="background-image:url(https://res.weread.qq.com/wrepub/web/910419/copyright.jpg);"
  const style = el.type === 'tag' ? el.attribs?.style : ''
  if (style?.includes('background-image:')) {
    const m = /(?:^|; *?)background-image *?: *?url\(([\S]+?)\)/.exec(style)
    if (m?.[1]) {
      const src = m[1]
      $(el).attr('data-bg-img', src) // mark, has no effect, the result html will be abondoned

      // TODO: 无法处理
      // <div data-wr-bd=\"1\" data-wr-inset=\"1\" data-wr-co=\"344\" class=\"bgimg\" style=\"background-image:url(../Images/copyright.jpg)
      if (src && !(src.startsWith('../') || src.startsWith('./'))) {
        ctx.push(src)
      }
    }
  }
}

function fixImgSrc(el: $Element, $: CheerioAPI, ctx: any): OnNodeResult {
  if (el.type !== 'tag') return

  if (el.tagName?.toLowerCase?.() === 'img') {
    const $el = $(el)

    if ($el.hasClass(CLASS_FOOTNOTE)) {
      return
    }

    // remove alt
    $el.removeAttr('alt')

    // transform & change src
    const src = $el.data('src')
    const newSrc = ctx.transformImgSrc(src)
    ctx.imgs.push({
      src,
      newSrc,
    })
    $el.attr('src', newSrc)

    // fix width & style
    // <img src="imgs/epub_40870013_2.png" data-src="https://res.weread.qq.com/wrepub/epub_40870013_2" style="width: 15%" width="15%"/>
    // ERROR(RSC-005): ./CSS新世界.epub/OEBPS/chapter-6.xhtml(20,181): Error while parsing file: value of attribute "width" is invalid; must be an integer
    const width = $(el).attr('width')
    const height = $(el).attr('height')
    if (width && isNaN(Number(width))) {
      $(el).css('width', width).removeAttr('width')
    }
    if (height && isNaN(Number(height))) {
      $(el).css('height', height).removeAttr('height')
    }

    return
  }

  // style="background-image:url(https://res.weread.qq.com/wrepub/web/910419/copyright.jpg);"
  const style: string = el.attribs?.style
  if (style?.includes('background-image:')) {
    const m = /(?:^|; *?)background-image *?: *?url\(([\S]+?)\)/.exec(style)
    if (m?.[1]) {
      const $el = $(el)
      const src = m[1]

      // transform
      const newSrc = ctx.transformImgSrc(src)

      if (newSrc) {
        ctx.imgs.push({
          src,
          newSrc,
        })

        // replace style
        const newStyle = style.replace(src, newSrc)
        $el.attr('style', newStyle)
      }

      // 当 src 404 时, 丢弃 style
      else {
        debug('fixImgSrc: transformImgSrc return empty for %s', src)

        const newStyle = style
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean)
          .filter((oneStyle) => !oneStyle.startsWith('background-image:'))
          .join(';')

        if (newStyle) {
          $el.attr('style', newStyle)
          debug('fixImgSrc: style=%s -> style=%s', style, newStyle)
        } else {
          $el.removeAttr('style')
          debug('fixImgSrc: removeAttr style=%s', style)
        }
      }
    }
  }
}
