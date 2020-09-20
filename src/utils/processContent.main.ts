import {Worker} from 'worker_threads'
import * as Comlink from 'comlink/dist/umd/comlink'
import nodeEndpoint from 'comlink/dist/umd/node-adapter'
import os from 'os'
import type processContent from './processContent'

type ProcessContent = typeof processContent

export function createWorker() {
  const worker = new Worker(__dirname + '/processContent.worker.js')
  const api = Comlink.wrap(nodeEndpoint(worker)) as Comlink.Remote<{
    processContent: ProcessContent
  }>
  return {api, nodeWorker: worker}
}

export function createWorkers() {
  const cpuCores = os.cpus().length
  return new Array(cpuCores).fill(0).map(($$) => {
    return createWorker()
  })
}
