/*
 * Copyright 2022 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

// A simple, pointless task
function performJob(cb) {
  const n = 1e4 + Math.ceil(Math.random() * (1e5 - 1e4))
  const primes = [2]
  let largest = 3

  function isPrime(k) {
    const sqrtK = Math.sqrt(k)
    for (let i = 0; primes[i] <= sqrtK; i++) {
      if (k % primes[i] === 0) {
        return false
      }
    }
    return true
  }

  while (primes.length < n) {
    if (isPrime(largest)) {
      primes.push(largest)
    }
    largest += 2
  }
  const nthPrime = primes[primes.length - 1]
  cb(null, { n, nthPrime })
}

module.exports = { performJob }
