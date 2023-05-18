/*
 * Copyright 2023 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

async function sleep(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function randomlyFail(type) {
  await sleep(1000)
  const randomNumber = Math.round(Math.random() * 100)

  if (randomNumber >= 90) {
    let error

    if (randomNumber % 2 === 0) {
      error = new Error(`Encountered expected application error`)
      error.isExpected = true
    } else {
      error = new Error(`Encountered unexpected application error`)
      error.isExpected = false
    }

    if (type === 'database') {
      error.metadata = { component: 'database' }
    }

    if (type === 'api') {
      error.metadata = { component: 'api' }
    }

    throw error
  }
}

module.exports = {
  interactWithDatabase: () => randomlyFail('database'),
  interactWithAPI: () => randomlyFail('api')
}
