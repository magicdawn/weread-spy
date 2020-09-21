#!/usr/bin/env node

const inNodeModules = __filename.includes('/node_modules/')
const useLib = process.argv.includes('--use-lib')

if (inNodeModules || useLib) {
  require('../lib/bin')
} else {
  console.warn('[ts-node]: THIS is slow !!!')
  require('ts-node').register({scriptMode: true})
  require('../src/bin')
}
