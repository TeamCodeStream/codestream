/*
 * Copyright 2022 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const newrelic = require('newrelic')

newrelic.instrument('./job-thing', function instrument(shim, module) {
  shim.wrap(module, 'performJob', function wrapCreator(shim, originalPerformJob) {
    return function wrappedPerformJob(callback, headers) {
      // A web transaction may or may not exist, depending on how
      // `performJob` was called. If we got here by the /schedule-job
      // HTTP endpoint, there no longer is a web transaction to link
      // to. If it was via /run-job HTTP endpoint, then we're still
      // running inside a web transaction.
      const webTransaction = newrelic.getTransaction()

      newrelic.startBackgroundTransaction('jobThingTransaction', 'jobs', () => {
        const backgroundTransaction = newrelic.getTransaction()

        // Headers might be empty if there's no enclosing web transaction
        backgroundTransaction.acceptDistributedTraceHeaders('HTTP', headers)

        function endWebTransaction() {
          webTransaction.end()
        }

        function wrappedCallback(err, output) {
          // We can add the job's output as custom span attributes (in
          // this case, `n` and `nthPrime`)
          newrelic.addCustomSpanAttributes(output)
          callback(err, output)
          backgroundTransaction.end(endWebTransaction)
        }
        newrelic.startSegment('performJobSegment', false, originalPerformJob, wrappedCallback)
      })
    }
  })
})

newrelic.instrument('./util', function instrument(shim, module) {
  shim.wrap(module, 'runJob', function wrapCreator(shim, originalRunJob) {
    return function wrappedRunJob(_req, res) {
      // For illustrative purposes, end the existing Express
      // transaction from our standard instrumentation transaction and
      // start our own custom web transaction instead.
      newrelic.getTransaction().end()

      newrelic.startWebTransaction('customRunJobWebTransaction', function webTransactionHandler() {
        const webTransaction = newrelic.getTransaction()
        // Pass headers around with distributed tracing linking data
        const headers = {}
        webTransaction.insertDistributedTraceHeaders(headers)
        return originalRunJob(_req, res, headers)
      })
    }
  })
})
