#!/usr/bin/env ts-node-script

// main()

// import startInfo from '../data/book/25462428/00-start-info.json'
// async function test() {
//   console.log(processContent(startInfo))
// }
// test()

import yargs from 'yargs'
import debugFactory from 'debug'
import downloadCommand from './commands/download'
import genEpubCommand from './commands/gen'

// enable logs
if (!process.env.DEBUG) {
  debugFactory.enable('weread-spy:*')
}

yargs
  //
  .command(downloadCommand)
  .command(genEpubCommand)
  .demandCommand()
  .help().argv
