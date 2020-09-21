import path from 'path'
import _ from 'lodash'
import {Data, APP_ROOT} from './common'
import {FileItem, FileItemFields} from './EpubModel'

export type NavItem = {
  id: string
  filename: string
  title: string
  playOrder: number
  children?: NavItem[]
}

export default class Book {
  data: Data

  // normal files
  manifestFiles: FileItem[] = []

  // 封面
  coverPageFile: FileItem // cover.xhtml

  // 导航
  navPageFile: FileItem

  // 章节
  textFiles: FileItem[] = []

  constructor(data: Data) {
    this.data = data
  }

  /**
   * getters
   */

  get bookId() {
    return this.data.startInfo.bookId
  }

  get bookDir() {
    return path.join(APP_ROOT, `data/book/${this.bookId}/`)
  }

  get coverUrl(): string {
    let imgUrl = this.data.startInfo.bookInfo.cover

    // e.g
    // https://wfqqreader-1252317822.image.myqcloud.com/cover/723/26224723/s_26224723.jpg
    // https://wfqqreader-1252317822.image.myqcloud.com/cover/723/26224723/t9_26224723.jpg
    if (/(s)_\d+\.\w+$/.test(imgUrl)) {
      imgUrl = imgUrl.replace(/s_(\d+\.\w+)$/, 't9_$1')
    }

    return imgUrl
  }

  addFile = (f: FileItemFields | FileItem) => {
    if (f instanceof FileItem) {
      this.manifestFiles.push(f)
    } else {
      const fileItem = new FileItem(f)
      this.manifestFiles.push(fileItem)
    }
    return this
  }

  addTextFile = (options: FileItemFields) => {
    const f = new FileItem(options)
    this.textFiles.push(f)
    return this
  }

  getManifest() {
    return [this.coverPageFile, this.navPageFile, ...this.textFiles, ...this.manifestFiles].filter(
      Boolean
    )
  }

  getSpine() {
    return [this.coverPageFile, this.navPageFile, ...this.textFiles].filter(Boolean)
  }

  getNavInfo() {
    const navItems: NavItem[] = []
    let f: FileItem
    let maxNavDepth = 1
    let playOrder = 1

    // 封面
    if (this.coverPageFile) {
      f = this.coverPageFile
      const {id, filename} = f
      navItems.push({
        id,
        filename,
        title: '封面',
        playOrder: playOrder++,
      })
    }

    // 目录
    if (this.navPageFile) {
      f = this.navPageFile
      const {id, filename} = f
      navItems.push({
        id,
        filename,
        title: '目录',
        playOrder: playOrder++,
      })
    }

    // 章节
    this.data.startInfo.chapterInfos.forEach((cur, index) => {
      maxNavDepth = Math.max(maxNavDepth, cur.level)

      let arr = navItems
      _.times(cur.level - 1, () => {
        const item = _.last(navItems)
        if (!item.children) item.children = []
        arr = item.children
      })

      const {id, filename} = this.textFiles[index]
      arr.push({
        id,
        filename,
        title: cur.title,
        playOrder: playOrder++,
      })
    })

    return {navItems, maxNavDepth}
  }
}
