import fse from 'fs-extra'
import path from 'path'
import { BOOKS_DIR } from './index.js'

const { outputJSON, pathExists, readJSON } = fse

// v1: json = { [id]: {title,id,url} }
// v2: json = [ {id, title, url} ]
export const BOOKS_MAP_FILE = path.join(BOOKS_DIR, 'map-v2.json')

export type BookItem = {
  id: string
  title: string
  url: string
}

export let currentBooks: BookItem[] = []

let loaded = false
async function load() {
  if (loaded) return

  let list: BookItem[] = []
  if (await pathExists(BOOKS_MAP_FILE)) list = await readJSON(BOOKS_MAP_FILE)

  currentBooks = list
  loaded = true
}
async function save() {
  return outputJSON(BOOKS_MAP_FILE, currentBooks, { spaces: 2 })
}

export async function addBook(item: BookItem) {
  await load()
  const list = currentBooks.slice()

  // remove
  const { id, url } = item
  {
    const index = list.findIndex((x) => x.id === id)
    if (index > -1) list.splice(index, 1)
  }
  {
    const index = list.findIndex((x) => x.url === url)
    if (index > -1) list.splice(index, 1)
  }

  list.push(item)
  currentBooks = list
  save()
}

export async function queryBook(query: Partial<BookItem>) {
  await load()
  const item = currentBooks.find((item) => Object.keys(query).every((k) => item[k] === query[k]))
  return item
}
