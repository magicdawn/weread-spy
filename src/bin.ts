#!/usr/bin/env ts-node-script

import yargs from 'yargs'
import debugFactory from 'debug'
import downloadCommand from './commands/download'
import genEpubCommand from './commands/gen'
import launchCommand from './commands/launch'
import checkCommand from './commands/check'

// enable logs
if (!process.env.DEBUG) {
  debugFactory.enable('weread-spy:*')
}

yargs
  .command(downloadCommand)
  .command(genEpubCommand)
  .command(launchCommand)
  .command(checkCommand)
  .demandCommand()
  .help().argv
