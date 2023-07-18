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
  esbuildOptions(options, context) {
    // init
    options.external ||= []

    options.external.push(__dirname + '/package.json')

    // use ascii in prod
    options.charset = prod ? undefined : 'utf8'
  },
})
