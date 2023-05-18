/*
 * Copyright 2022 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const express = require('express')
const { PORT = '3000', HOST = 'localhost' } = process.env
const { Client } = require('./nifty-messages')

const client = new Client()

const messagesFromSub = {}

const app = express()
app.listen(PORT, HOST, function listen() {
  const addr = this.address()
  const host = addr.family === 'IPv6' ? `[${addr.address}]` : addr.address
  console.log('Server started at http://%s:%s', host, addr.port)
})

app.get('/publish', (req, res) => {
  const msg = req.query.msg
  const queueName = req.query.queue || 'main'
  client.publish(queueName, msg, () => {
    res.send([`Published message: ${msg}`])
  })
})

app.get('/purge', (req, res) => {
  const queueName = req.query.queue || 'main'
  client.purge(queueName, () => {
    res.send([`Purged queue: ${queueName}`])
  })
})

app.get('/', (req, res) => {
  const queueName = req.query.queue || 'main'
  client.getMessage(queueName, (err, msg) => {
    if (err) {
      console.log(err.message)
    }
    const reply = []
    if (msg.msg === undefined) {
      reply.push('No message in queue')
    } else {
      reply.push(`Got message: '${msg.msg}'`)
    }
    const queue = messagesFromSub[queueName]
    if (queue) {
      for (const subMsg of queue) {
        reply.push(`Got message from subscription: '${subMsg.msg}' on queue ${msg.queueName}`)
      }
      messagesFromSub[queueName] = []
    }
    res.send(reply)
  })
})

app.get('/subscribe', (req, res) => {
  const queueName = req.query.queue || 'main'
  client.subscribe(
    queueName,
    () => {
      res.send([`Subscribed to queue ${queueName}`])
    },
    function consumeMessage(msg) {
      if (messagesFromSub[queueName] === undefined) {
        messagesFromSub[queueName] = []
      }
      messagesFromSub[queueName].push(msg)
    }
  )
})
