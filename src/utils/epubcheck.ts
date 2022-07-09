import execa from 'execa'
import path from 'path'
import { PROJECT_ROOT } from '../common'

export default function epubcheck(file: string) {
  const epubcheckJar = path.join(PROJECT_ROOT, 'assets/epubcheck.jar')
  const cmd = `java -jar ${epubcheckJar} '${file}'`
  console.log('[exec]: %s', cmd)
  try {
    execa.commandSync(cmd, { stdio: 'inherit', shell: true })
  } catch (error) {
    // ignore
  }
}
