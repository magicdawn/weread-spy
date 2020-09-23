import path from 'path'
import execa from 'execa'
import {APP_ROOT} from './common'

export default function epubcheck(file: string) {
  const epubcheckJar = path.join(APP_ROOT, 'assets/epubcheck.jar')
  const cmd = `java -jar ${epubcheckJar} '${file}'`
  console.log('[exec]: %s', cmd)
  try {
    execa.commandSync(cmd, {stdio: 'inherit', shell: true})
  } catch (error) {
    // ignore
  }
}
