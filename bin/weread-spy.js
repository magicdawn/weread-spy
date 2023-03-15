#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires */
// const isDev = require('fs').existsSync(__dirname + '/.dev')
const isDev = false

if (isDev) {
  require('ts-node').register({
    project: __dirname + '/../tsconfig.json',
  })
  require('../src/bin')
} else {
  require('../dist/bin')
}
