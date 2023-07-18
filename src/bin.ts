#!/usr/bin/env node

import { Builtins, Cli } from 'clipanion'
import debugFactory from 'debug'
import { CheckCommand } from './commands/check.js'
import { DownloadCommand } from './commands/download.js'
import { GenCommand } from './commands/gen.js'
import { InfoCommand } from './commands/info.js'
import { LaunchCommand } from './commands/launch.js'
import { OneCommand } from './commands/one.js'
import { $esm } from './common/index.js'

const { require } = $esm(import.meta)

// enable logs
if (!process.env.DEBUG) {
  debugFactory.enable('weread-spy:*')
}

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
cli.register(OneCommand)
cli.register(DownloadCommand)
cli.register(GenCommand)
cli.register(LaunchCommand)
cli.register(CheckCommand)
cli.register(InfoCommand)

cli.runExit(process.argv.slice(2), {
  ...Cli.defaultContext,
})
