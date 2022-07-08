import { parentPort } from 'worker_threads'
import * as Comlink from 'comlink/dist/umd/comlink'
import nodeEndpoint from 'comlink/dist/umd/node-adapter'
import processContent, { getImgSrcs } from './index'

const api = {
  processContent,
  getImgSrcs,
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
Comlink.expose(api, nodeEndpoint(parentPort!))
