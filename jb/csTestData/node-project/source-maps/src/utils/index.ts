export async function sleep (ms: number): Promise<void> {
  await new Promise<void>(function resolveSleepPromise (resolve) {
    setTimeout(function resolveSleep () {
      resolve()
    }, ms)
  })
}

export default {
  sleep
}
