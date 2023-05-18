/*
 * Copyright 2022 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const EventEmitter = require('node:events')

class Client extends EventEmitter {
  constructor() {
    super()
    this.queues = {}
    this.handlers = {}
  }

  publish(queueName, msg, cb) {
    console.log("called method 'publish'")
    if (this.queues[queueName] === undefined) {
      this.#initQueue(queueName)
    }
    this.queues[queueName].push(msg)
    this.emit(`message:${queueName}`)
    cb()
  }

  purge(queueName, cb) {
    console.log("called method 'purge'")
    if (this.queues[queueName] === undefined) {
      return cb(new Error('unknown queue'))
    }
    this.queues[queueName] = []
    return cb()
  }

  getMessage(queueName, cb) {
    console.log("called method 'getMessage'")
    const queue = this.queues[queueName]
    if (queue === undefined) {
      return cb(new Error('unknown queue'), { msg: undefined, queueName })
    }
    const msg = queue.shift()
    return cb(null, { msg, queueName })
  }

  subscribe(queueName, cb, handler) {
    console.log("called method 'subscribe'")
    if (this.queues[queueName] === undefined) {
      this.#initQueue(queueName)
    }
    this.handlers[queueName].push(handler)
    cb()
  }

  #initQueue(queueName) {
    this.queues[queueName] = []
    this.handlers[queueName] = []
    // Queue will always listen, although it might not have any
    // handlers to do anything.
    this.on(`message:${queueName}`, () => {
      const handlers = this.handlers[queueName]
      if (handlers.length > 0) {
        const queue = this.queues[queueName]
        const msg = queue.shift()
        for (const msgHandler of handlers) {
          console.log(`called handler on queue '${queueName}'`)
          msgHandler({ msg, queueName })
        }
      }
    })
  }
}

module.exports = { Client }
