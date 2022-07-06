/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
require('ts-node').register({
  project: path.join(__dirname, '/../../../tsconfig.json'),
})
require(__dirname + '/index.worker.ts')
