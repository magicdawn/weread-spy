import { Worker } from 'worker_threads'
import * as Comlink from 'comlink/dist/umd/comlink'
import nodeEndpoint from 'comlink/dist/umd/node-adapter'
import os from 'os'

import type processContent from './index'
type ProcessContent = typeof processContent

/**
 * 如果使用 ts-node
 * 开发使用 __dirname + /processContent.worker.js
 * 内容是 require ts-node/register + require processContent.worker.ts
 *
 * ts 编译后, processContent.worker.ts -> processContent.worker.js
 */

export function createWorker() {
  const worker = new Worker(__dirname + '/index.worker.js')
  const api = Comlink.wrap(nodeEndpoint(worker)) as Comlink.Remote<{
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
