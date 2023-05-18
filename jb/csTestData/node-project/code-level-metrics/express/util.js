/*
 * Copyright 2022 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const { performJob } = require('./job-thing')

function proclaimResults(err, { n, nthPrime }) {
  console.log(`The prime at position ${n} is ${nthPrime}`)
}

module.exports = {
  scheduleJob(_req, res) {
    setTimeout(performJob, 0, proclaimResults)
    res.send('started a job')
  },
  runJob(_req, res, headers) {
    performJob(proclaimResults, headers)
    res.send('ran a job')
  }
}
