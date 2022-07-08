import { execSync } from 'child_process'
import fse from 'fs-extra'
import path from 'path'
import { version } from './package.json'

const exec = (cmd: string) => {
  console.log('[exec]: %s', cmd)
  execSync(cmd, { stdio: 'inherit' })
}

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

    // %1: node_modules/sharp/vendor/<version>/lib
    // %2: path-to-executable/sharp/vendor/<version>/lib
    fse.copySync(__dirname + '/node_modules/sharp/vendor', dir + '/sharp/vendor')

    // /node_modules/nunjucks/node_modules/chokidar/node_modules/fsevents/fsevents.node
    // fsevents.node
    // fse.copySync(
    //   __dirname +
    //     '/node_modules/nunjucks/node_modules/chokidar/node_modules/fsevents/fsevents.node',
    //   dir + '/fsevents.node'
    // )

    // epubcheck
    fse.copySync(__dirname + '/assets/lib', dir + '/assets/lib')
    fse.copySync(__dirname + '/assets/epubcheck.jar', dir + '/assets/epubcheck.jar')

    // build ts
    exec('pnpm build')

    // pkg
    exec(`pnpm dlx pkg -t node16-mac --out-path ${dir} .`)
  })
})
