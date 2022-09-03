import { execaCommandSync } from 'execa'
import path from 'path'
import { PROJECT_ROOT } from '../common/index.js'

export default function epubcheck(file: string) {
  const epubcheckJar = path.join(PROJECT_ROOT, 'assets/epubcheck.jar')
  const cmd = `java -jar ${epubcheckJar} '${file}'`
  console.log('[exec]: %s', cmd)
  try {
    execaCommandSync(cmd, { stdio: 'inherit', shell: true })
  } catch (error) {
    // ignore
  }
}
