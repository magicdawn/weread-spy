import * as Comlink from 'comlink/dist/esm/comlink.mjs'
import nodeEndpoint from 'comlink/dist/esm/node-adapter.mjs'
import { parentPort } from 'worker_threads'
import processContent, { getImgSrcs } from '../index.js'

const api = {
  processContent,
  getImgSrcs,
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
// @ts-ignore
Comlink.expose(api, nodeEndpoint(parentPort!))
