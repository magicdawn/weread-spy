import { Command } from 'clipanion'
import { getBrowser } from '../utils/pptr'

export class LaunchCommand extends Command {
  static usage = Command.Usage({
    description: '单纯启动内置的 puppeteer 浏览器',
  })

  static paths = [['launch']]

  async execute() {
    const { browser } = await getBrowser()
    // operate here
  }
}
