/*
 * Copyright 2022 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const express = require('express')

const { scheduleJob, runJob } = require('./util')

const { collectStreetAddresses } = require('./dataSource')

const app = express()
const { PORT = '3000', HOST = 'localhost' } = process.env

app.listen(PORT, HOST, function () {
  const addr = this.address()
  const host = addr.family === 'IPv6' ? `[${addr.address}]` : addr.address
  console.log('Server started at http://%s:%s', host, addr.port)
})

app.get('/named-mw', function namedMiddlweare(_req, res) {
  res.send('This is a named middleware handler')
})

app.get('/data', function dataHandler(_req, res) {
  const data = collectStreetAddresses()
  res.send(data)
})

app.get('/anon', function (_req, res) {
  res.send('anonymous mw handler')
})

app.get('/arrow', (_req, res) => {
  res.send('arrow fn mw handler')
})

function mw4(_req, _res, next) {
  next()
}

const handler = function (_req, res) {
  res.send('phew, that was a lot of hops')
}

// eslint-disable-next-line
app.get('/chained', function mw1(_req, _res, next) { next() }, function(_req, _res, next) { next() }, (_req, _res, next) => { next() }, mw4, handler)
// The above is deliberately ugly and in one line, with named,
// anonymous, and arrow functions all in one big mess.

app.get('/schedule-job', scheduleJob)
app.get('/run-job', runJob)
