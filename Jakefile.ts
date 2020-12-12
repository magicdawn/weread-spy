/// <reference types="jake" />
import {execSync} from 'child_process'

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
    exec('pkg -t node12-mac --out-path dist .')
  })
})
