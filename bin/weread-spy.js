#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires */
require('ts-node').register({
  project: __dirname + '/../tsconfig.json',
})

require('../src/bin')
