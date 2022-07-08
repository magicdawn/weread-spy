#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires */
const isDev = require('fs').existsSync(__dirname + '/.dev')

if (isDev) {
  require('ts-node').register({
    project: __dirname + '/../tsconfig.json',
  })
  require('../src/bin')
} else {
  require('../lib/bin')
}
