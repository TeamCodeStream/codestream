#!/usr/bin/env node
/*
 * Copyright 2022 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

process.env.NEW_RELIC_NO_CONFIG_FILE = true
process.env.NEW_RELIC_APP_NAME = 'log-generator'
// process.env.NEW_RELIC_LICENSE_KEY = <your-license-key>
process.env.NEW_RELIC_HOST = 'staging-collector.newrelic.com'
process.env.NEW_RELIC_LOG_LEVEL = 'info'
// set the next env var to false to disable all application logging features
process.env.NEW_RELIC_APPLICATION_LOGGING_ENABLED = true
process.env.NEW_RELIC_APPLICATION_LOGGING_FORWARDING_ENABLED = true
process.env.NEW_RELIC_APPLICATION_LOGGING_METRICS_ENABLED = true
process.env.NEW_RELIC_APPLICATION_LOGGING_FORWARDING_MAX_SAMPLES_STORED = 10000
process.env.NEW_RELIC_APPLICATION_LOGGING_LOCAL_DECORATING_ENABLED = false

const newrelic = require('newrelic')
// we can't put a listener for 'errored'
// because this happens before `const newrelic = require('newrelic')`
// wrap in next tick so we can error from agent before exiting process
process.nextTick(() => {
  if (newrelic.agent._state === 'errored') {
    process.exit(1)
  }
})

const yargs = require('yargs')
const { hideBin } = require('yargs/helpers')
const faker = require('faker')

function getArgs() {
  return yargs(hideBin(process.argv))
    .scriptName(process.env.NEW_RELIC_APP_NAME)
    .usage(
      'Usage: $0 OPTIONS\n\nstarts a process that will generate logs with either winston or pino'
    )
    .option('logtype', {
      alias: 'l',
      describe: 'which logger to use',
      choices: ['winston', 'pino'],
      default: 'winston',
      type: 'string'
    })
    .option('interval', {
      alias: 'i',
      describe: 'interval in milliseconds to wait between each round of log messages',
      default: 200,
      type: 'number'
    })
    .option('count', {
      alias: 'c',
      describe: 'number of log messages to produce at each round',
      default: 1,
      type: 'number'
    })
    .option('size', {
      alias: 's',
      describe: 'size of each log message, in characters',
      default: 128,
      type: 'number'
    })
    .option('duration', {
      alias: 'd',
      describe: 'how many seconds to run for (use 0 seconds to run forever)',
      default: 0,
      type: 'number'
    })
    .help().argv
}

// https://stackoverflow.com/a/55671924
function weightedRandom(options) {
  let i

  const weights = []

  for (i = 0; i < options.length; i++) {
    weights[i] = options[i].weight + (weights[i - 1] || 0)
  }

  const random = Math.random() * weights[weights.length - 1]

  for (i = 0; i < weights.length; i++) {
    if (weights[i] > random) {
      break
    }
  }

  return options[i].item
}

function getRandomLogLevel() {
  // Winston and pino define different log levels, but at least have
  // these in common.
  const logLevels = [
    { item: 'error', weight: 1 },
    { item: 'warn', weight: 4 },
    { item: 'info', weight: 16 },
    { item: 'debug', weight: 64 }
  ]

  return weightedRandom(logLevels)
}

function getLogger(logtype) {
  let logger
  if (logtype === 'winston') {
    const winston = require('winston')
    const { createLogger, format, transports } = winston

    logger = createLogger({
      level: 'debug',
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
      ),
      defaultMeta: { service: process.env.NEW_RELIC_APP_NAME },
      transports: [new transports.Console()]
    })
  } else {
    const pino = require('pino')
    logger = pino({ level: 'debug' })
  }

  return logger
}

function runOneBatchOfLogs(logger, interval, count, size) {
  return new Promise((resolve) => {
    setTimeout(() => {
      for (let i = 0; i < count; i++) {
        logger[getRandomLogLevel()](faker.random.alphaNumeric(size))
      }
      resolve()
    }, interval)
  })
}

function run(logger, interval, count, size) {
  newrelic
    .startBackgroundTransaction('loggingTransaction', () => {
      return runOneBatchOfLogs(logger, interval, count, size)
    })
    .then(() => {
      run(logger, interval, count, size)
    })
}

function shutdown() {
  newrelic.shutdown({ collectPendingData: true }, () => {
    process.exit(0) // eslint-disable-line no-process-exit
  })
}

function setUp(duration) {
  if (duration > 0) {
    setTimeout(shutdown, duration * 1000)
  }

  process.on('SIGINT', shutdown)
}

const { logtype, interval, count, size, duration } = getArgs()
const logger = getLogger(logtype)

setUp(duration)
run(logger, interval, count, size)
