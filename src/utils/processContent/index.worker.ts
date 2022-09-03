import { parentPort } from 'worker_threads'
import * as Comlink from 'comlink/dist/umd/comlink.js'
import nodeEndpoint from 'comlink/dist/umd/node-adapter.js'
import processContent, { getImgSrcs } from './index.js'

const api = {
  processContent,
  getImgSrcs,
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
Comlink.expose(api, nodeEndpoint.default(parentPort!))
