/// <reference types="jake" />
import {execSync} from 'child_process'
import fse from 'fs-extra'
import path from 'path'
import {version} from './package.json'

const exec = (cmd: string) => {
  console.log('[exec]: %s', cmd)
  execSync(cmd, {stdio: 'inherit'})
}

desc('say hello')
task('hello', (...args) => {
  exec(`say "${args.join(' ')}"`)
})

desc('show available tasks')
task('default', () => {
  exec('jake -t')
})

namespace('build', () => {
  desc('build executable via pkg')
  task('pkg', () => {
    const dir = path.join(__dirname, 'dist', 'v' + version)
    fse.emptyDirSync(dir)

    // other
    fse.copySync(__dirname + '/node_modules/puppeteer/.local-chromium/', dir + '/puppeteer')

    // %1: node_modules/sharp/build/Release
    // %2: path-to-executable/sharp/build/Release
    fse.copySync(__dirname + '/node_modules/sharp/build/Release', dir + '/sharp/build/Release')

    // %1: node_modules/sharp/vendor/lib
    // %2: path-to-executable/sharp/vendor/lib
    fse.copySync(
      __dirname + '/node_modules/sharp/vendor/8.10.0/lib',
      dir + '/sharp/vendor/8.10.0/lib'
    )

    // /node_modules/nunjucks/node_modules/chokidar/node_modules/fsevents/fsevents.node
    // fsevents.node
    fse.copySync(
      __dirname +
        '/node_modules/nunjucks/node_modules/chokidar/node_modules/fsevents/fsevents.node',
      dir + '/fsevents.node'
    )

    // epubcheck
    fse.copySync(__dirname + '/assets/lib', dir + '/assets/lib')
    fse.copySync(__dirname + '/assets/epubcheck.jar', dir + '/assets/epubcheck.jar')

    // build ts
    exec('yarn build')
    // pkg
    exec(`pkg -t node12-mac --out-path ${dir} .`)
  })
})
