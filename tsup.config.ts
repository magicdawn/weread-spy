import $esm from 'esm-utils'
import { defineConfig } from 'tsup'

const { __dirname } = $esm(import.meta)

process.env.NODE_ENV ||= 'development'
const prod = process.env.NODE_ENV === 'production'

export default defineConfig({
  entry: {
    'bin': 'src/bin.ts',
    'processContent.worker': 'src/utils/processContent/worker/index.worker.ts',
  },
  format: 'esm',
  platform: 'node',
  target: 'node16',
  clean: true,
  minify: prod,
  env: {
    NODE_ENV: process.env.NODE_ENV,
  },

  // NOTE: puppeteer-intercept-and-modify-requests 这个包 esm build 有问题
  noExternal: ['puppeteer-intercept-and-modify-requests'],
  external: ['why-is-node-running'],

  esbuildOptions(options, context) {
    // init
    options.external ||= []

    options.external.push(__dirname + '/package.json')

    // use ascii in prod
    options.charset = prod ? undefined : 'utf8'
  },
})
