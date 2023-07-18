import * as Comlink from 'comlink/dist/esm/comlink.js'
import nodeEndpoint from 'comlink/dist/esm/node-adapter.js'
import { parentPort } from 'worker_threads'
import processContent, { getImgSrcs } from '../index.js'

const api = {
  processContent,
  getImgSrcs,
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
// @ts-ignore
Comlink.expose(api, nodeEndpoint(parentPort!))
