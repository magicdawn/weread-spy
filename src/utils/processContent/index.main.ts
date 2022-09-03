import { Worker } from 'worker_threads'
import * as Comlink from 'comlink/dist/umd/comlink.js'
import nodeEndpoint from 'comlink/dist/umd/node-adapter.js'
import os from 'os'

import type processContent from './index.js'
type ProcessContent = typeof processContent

/**
 * 如果使用 ts-node
 * 开发使用 __dirname + /index.worker.js
 * 内容是 require ts-node/register + require index.worker.ts
 *
 * ts 编译后,
 * ./index.worker.ts -> dist/index.worker.js
 * ./index.worker.js 不参与 ts 编译
 */

export function createWorker() {
  const worker = new Worker(__dirname + '/index.worker.js')
  const api = Comlink.wrap(nodeEndpoint.default(worker)) as Comlink.Remote<{
    processContent: ProcessContent
  }>
  return { api, nodeWorker: worker }
}

export function createWorkers() {
  const cpuCores = os.cpus().length - 1 // 做个人吧~
  return new Array(cpuCores).fill(0).map(() => {
    return createWorker()
  })
}
