#!/usr/bin/env ts-node-script

import debugFactory from 'debug'
import {Cli, Command} from 'clipanion'

import GenEpubCommand from './commands/gen'
import LaunchCommand from './commands/launch'
import CheckCommand from './commands/check'
import DownloadCommand from './commands/download'
import OneCommand from './commands/one'

// enable logs
if (!process.env.DEBUG) {
  debugFactory.enable('weread-spy:*')
}

// @ts-ignore
const {version} = require('../package.json')

const cli = new Cli({
  binaryLabel: 'Weread Spy',
  binaryName: 'weread-spy',
  binaryVersion: version,
})

// default commands
cli.register(Command.Entries.Help)
cli.register(Command.Entries.Version)

// commands
cli.register(DownloadCommand)
cli.register(GenEpubCommand)
cli.register(LaunchCommand)
cli.register(CheckCommand)
cli.register(OneCommand)

cli.runExit(process.argv.slice(2), {
  ...Cli.defaultContext,
})
