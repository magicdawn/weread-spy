import { PROJECT_ROOT } from '$common'
import * as execa from 'execa'
import path from 'path'

// epubchecker 安装时从 github release 下载, 且没有使用 http_proxy
// function getJarPath() {
//   const dir = path.dirname(require.resolve('epubchecker/package.json'))
//   const jar = fg.sync('**/epubcheck.jar', { cwd: dir, absolute: true })[0]
//   return jar
// }

function getJarPath() {
  return path.join(PROJECT_ROOT, 'assets/epubcheck-5.0.0/epubcheck.jar')
}

export default function epubcheck(file: string) {
  const epubcheckJar = getJarPath()
  if (!epubcheckJar) {
    console.error('can not find epubcheck.jar')
    process.exit(1)
  }

  const cmd = `java -jar '${epubcheckJar}' '${file}'`
  console.log('[exec]: %s', cmd)
  try {
    execa.execaCommandSync(cmd, { stdio: 'inherit', shell: true })
  } catch (error) {
    // ignore
  }
}
