import { Command, Usage } from 'clipanion'
import { BOOKS_MAP_FILE, currentBooks, loadBooks } from '../common/books-map.js'
import { BOOKS_DIR, PPTR_DATA_DIR } from '../common/index.js'

export class InfoCommand extends Command {
  static paths?: string[][] = [['info']]
  static usage?: Usage = {
    description: '查看相关文件夹位置, 储存的书籍信息',
  }

  async execute(): Promise<number | void> {
    console.log('目录信息:')
    console.log('  PPTR_DATA_DIR: %s', PPTR_DATA_DIR)
    console.log('      BOOKS_DIR: %s', BOOKS_DIR)
    console.log(' BOOKS_MAP_FILE: %s', BOOKS_MAP_FILE)
    console.log()

    await loadBooks()
    console.log('Books: \n')
    for (const item of currentBooks) {
      console.log('%s', item.title)
      console.log('  ID: %s', item.id)
      console.log('  URL: %s', item.url)
      console.log('')
    }
  }
}
