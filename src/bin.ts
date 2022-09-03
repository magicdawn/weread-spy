import debugFactory from 'debug'
import { Builtins, Cli } from 'clipanion'

import GenEpubCommand from './commands/gen.js'
import LaunchCommand from './commands/launch.js'
import CheckCommand from './commands/check.js'
import DownloadCommand from './commands/download.js'
import OneCommand from './commands/one.js'
import { createRequire } from 'module'

// enable logs
if (!process.env.DEBUG) {
  debugFactory.enable('weread-spy:*')
}

const require = createRequire(import.meta.url)
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../package.json')

const cli = new Cli({
  binaryLabel: '微信读书下载器',
  binaryName: 'weread-spy',
  binaryVersion: version,
})

// default commands
cli.register(Builtins.HelpCommand)
cli.register(Builtins.VersionCommand)

// commands
cli.register(DownloadCommand)
cli.register(GenEpubCommand)
cli.register(LaunchCommand)
cli.register(CheckCommand)
cli.register(OneCommand)

cli.runExit(process.argv.slice(2), {
  ...Cli.defaultContext,
})
