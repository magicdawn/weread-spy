import { outputJSON, pathExists, readJSON } from 'fs-extra'
import path from 'path'
import { BOOKS_DIR } from './index'

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
export async function loadBooks() {
  if (loaded) return

  let list: BookItem[] = []
  if (await pathExists(BOOKS_MAP_FILE)) list = await readJSON(BOOKS_MAP_FILE)

  currentBooks = list
  loaded = true
}
export async function saveBooks() {
  return outputJSON(BOOKS_MAP_FILE, currentBooks, { spaces: 2 })
}

export async function addBook(item: BookItem) {
  await loadBooks()
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
  saveBooks()
}

export async function queryBook(query: Partial<BookItem>) {
  await loadBooks()
  const item = currentBooks.find((item) => Object.keys(query).every((k) => item[k] === query[k]))
  return item
}

export async function queryBookAny(query: string) {
  let _query: Partial<BookItem> = {}
  if (/^\d+$/.test(query)) {
    _query = { id: query }
  } else if (/^https?:\/\//.test(query)) {
    _query = { url: query }
  } else {
    _query = { title: query }
  }
  return queryBook(_query)
}
