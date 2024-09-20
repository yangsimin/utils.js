import { DeferredPromise } from "./deferredPromise"

type Callback<T> = (data?: T) => void

/**
 * 将使用 Callback 回调的函数转为生成 Iterable。 
 * Callback 结束时，必须回调 undefined，以表示结束
 * 
 * @param func 使用 Callback 回调的函数
 */
function callbackToIterable<T = any>(func: (callback: Callback<T>) => void): AsyncIterable<T> {
  const buffer: IteratorResult<T, any>[] = []
  let _done = false
  let deferredPromises: DeferredPromise<IteratorResult<T, any>>[] = []

  func((data) => {
    if (data === undefined) {
      _done = true
      return deferredPromises.forEach((promise) => promise.resolve({ done: true, value: undefined }))
    }

    const result = { value: data, done: false }
    if (deferredPromises.length === 0) {
      buffer.push(result)
    } else {
      deferredPromises.shift()!.resolve(result)
    }
  })

  return {
    [Symbol.asyncIterator]: () => ({
      next: async (): Promise<IteratorResult<T, any>> => {
        if (_done && buffer.length === 0) { return Promise.resolve({ done: true, value: undefined }) }

        if (buffer.length === 0) {
          const deferredPromise = new DeferredPromise()
          deferredPromises.push(deferredPromise)
          return deferredPromise
        }

        return Promise.resolve(buffer.shift()!)
      },
    }),
  }
}

async function main() {
  const countdown = async (callback: Callback<number>) => {
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      callback(i)
    }
    callback()
  }

  const generator = callbackToIterable(countdown)

  for await (const value of generator) {
    console.log(value)
  }
}

main()
