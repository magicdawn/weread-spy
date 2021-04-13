export default async function mapOnWorker<IN, OUT, W extends Object>(
  arr: IN[],
  fn: (item: IN, index: number, arr: IN[], worker: W) => Promise<OUT>,
  workers: W[]
): Promise<OUT[]> {
  return new Promise(function (resolve, reject) {
    let completed = 0
    let started = 0
    let running = 0
    const results = new Array(arr.length)

    const workerIsUnsing = new WeakMap()

    const getWorker = (index: number) => {
      for (let i = 0; i < workers.length; i++) {
        const worker = workers[i]
        if (workerIsUnsing.get(worker)) {
          continue
        } else {
          workerIsUnsing.set(worker, index) // mark `index` is using this worker
          return worker
        }
      }
    }

    ;(function replenish() {
      if (completed >= arr.length) {
        return resolve(results)
      }

      while (running < workers.length && started < arr.length) {
        ;(function (index) {
          const cur = arr[index]
          const worker = getWorker(index)
          Promise.resolve(fn.call(cur, cur, index, arr, worker))
            .then(function (result) {
              running--
              completed++
              results[index] = result
              workerIsUnsing.delete(worker)

              replenish()
            })
            .catch(reject)
        })(started)
        started++
        running++
      }
    })()
  })
}
