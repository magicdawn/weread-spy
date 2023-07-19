import { execSync } from 'child_process'
import epubcheckJarPath from 'epubcheck-assets'

// epubchecker 安装时从 github release 下载, 且没有使用 http_proxy
// function getJarPath() {
//   const dir = path.dirname(require.resolve('epubchecker/package.json'))
//   const jar = fg.sync('**/epubcheck.jar', { cwd: dir, absolute: true })[0]
//   return jar
// }

function getJarPath() {
  // return path.join(PROJECT_ROOT, 'assets/epubcheck-5.0.0/epubcheck.jar')
  return epubcheckJarPath
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
    execSync(cmd, { stdio: 'inherit' })
  } catch (error) {
    // ignore
  }
}
