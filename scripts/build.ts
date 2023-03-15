#!/usr/bin/env ts-node

import esbuild from 'esbuild'
import path from 'path'

const projectHome = path.join(__dirname, '..')

esbuild.buildSync({
  entryPoints: {
    'bin': path.join(projectHome, 'src/bin.ts'),
    'processContent.worker': path.join(projectHome, 'src/utils/processContent/index.worker.ts'),
  },
  bundle: true,
  outdir: path.join(projectHome, 'dist'),
  platform: 'node',
  target: ['node18'],
  packages: 'external',
  external: [path.join(projectHome, 'package.json')],
  minify: true,
  define: {
    'process.env.ESBUILD_BUNDLE': 'true',
  },
})
