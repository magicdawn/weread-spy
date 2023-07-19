import { $esm } from '$common/index'
import * as Comlink from 'comlink/dist/esm/comlink.mjs'
import nodeEndpoint from 'comlink/dist/esm/node-adapter.mjs' // NOTE: node-adpater 没有 .js 版本
import os from 'os'
import { Worker } from 'worker_threads'

import type processContent from '../index.js'
type ProcessContent = typeof processContent

const { __dirname } = $esm(import.meta)

export function createWorker() {
  const workerFile = __dirname + '/processContent.worker.js'
  const worker = new Worker(workerFile)
  // @ts-ignore
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
