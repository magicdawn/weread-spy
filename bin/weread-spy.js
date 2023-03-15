#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires */

let isDev = require('fs').existsSync(__dirname + '/.dev')

// force use dist
// FIXME: comment this before publish
// isDev = false

if (isDev) {
  require('ts-node').register({
    project: __dirname + '/../tsconfig.json',
  })
  require('../src/bin')
} else {
  require('../dist/bin')
}
