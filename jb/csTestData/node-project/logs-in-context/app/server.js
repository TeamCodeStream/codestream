/*
 * Copyright 2022 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

/**
 * This is an example Fastify server that depending on an env var
 * will either load pino or winston with their respective New Relic log enricher.
 *
 * There is 1 route `/` which will delay for 2 seconds before responding.  During this time
 * there will be 3 log messages that occur: before delay, after delay and sending response.
 *
 */
const start = async () => {
  const { PORT = 3000, HOST = 'localhost', WINSTON } = process.env
  let logger
  if (WINSTON) {
    const winston = require('winston')
    const nrWinston = require('@newrelic/winston-enricher')(winston)
    logger = winston.createLogger({
      levels: {
        fatal: 0,
        error: 1,
        warn: 2,
        info: 3,
        trace: 4,
        debug: 5
      },
      level: 'info',
      format: nrWinston(),
      transports: [new winston.transports.Console()]
    })
  } else {
    const nrPino = require('@newrelic/pino-enricher')
    const pino = require('pino')
    logger = pino(nrPino())
  }
  const fastify = require('fastify')({ logger, disableRequestLogging: true })

  fastify.get('/', async (request, reply) => {
    fastify.log.info('delaying request')
    await new Promise((resolve) => {
      setTimeout(() => {
        fastify.log.info('delay done')
        resolve()
      }, 2000)
    })
    fastify.log.info('sending response')
    reply.send({ hello: 'world' })
  })

  await fastify.listen(PORT, HOST)
}

start()
