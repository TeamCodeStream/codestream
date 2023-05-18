# Example instrumentation of a messaging application

This is an example app that uses the `newrelic.instrumentMessages` [API function](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/api-guides/nodejs-agent-api/#instrumentMessages) and associated [messaging shim API](https://newrelic.github.io/node-newrelic/MessageShim.html) to instrument a toy messaging library called Nifty Messages. This sample instrumentation is an implementation of the [New Relic messaging instrumentation tutorial](http://newrelic.github.io/node-newrelic/tutorial-Messaging-Simple.html).

## Getting started

1. Clone or fork, this repository,

2. Go into this subdirectory,

``` sh
cd newrelic-node-examples/messaging-app
```

3. Install dependencies and run application

```sh
npm ci
PORT=3000 NEW_RELIC_LICENSE_KEY=<Your New Relic License Key> npm start
```

This will start an Express app tied to a local-only Nifty Messages toy application at `http://localhost:3000`, with four endpoints: `/` for getting messages, `/purge` for purging a queue, `/publish` with a GET query parameter `msg` for publishing a message, and `/subscribe` for starting a message subscription to the `main` queue. All endpoints also accept a `queueName` GET parameter, which defaults to `main`.

4. Make requests to the application

```sh
# Publish two messages
curl 'http://localhost:3000/publish?msg=hello'
curl 'http://localhost:3000/publish?msg=goodbye'

# Fetch the two messages
curl 'http://localhost:3000/'
curl 'http://localhost:3000/'

# Publish two messages but immediately purge them
curl 'http://localhost:3000/publish?msg=hello+again'
curl 'http://localhost:3000/publish?msg=goodbye+again'
curl 'http://localhost:3000/purge'

# Subscribe to get all messages
curl 'http://localhost:3000/subscribe'

# Publish two more
curl 'http://localhost:3000/publish?msg=hello+yet+again'
curl 'http://localhost:3000/publish?msg=goodbye+yet+again'

# Get the messages processed by the subscription
curl 'http://localhost:3000/'
```

This should produce server output similar to this. The lines prefixed with `[NEWRELIC]` are output emitted by the sample instrumentation. The other lines are emitted by the messaging application itself.

```
[NEWRELIC] instrumenting ./nifty-messages
[NEWRELIC] instrumenting method 'publish'
[NEWRELIC] instrumenting method 'purge'
[NEWRELIC] instrumenting callbacks of method 'getMessage'
[NEWRELIC] instrumenting callbacks of method 'subscribe'
Server started at http://127.0.0.1:3000
[NEWRELIC] publish called on queue 'main' with message 'hello'
called method 'publish'
[NEWRELIC] publish called on queue 'main' with message 'goodbye'
called method 'publish'
called method 'getMessage'
[NEWRELIC] getMessage on queue main returned a message: 'hello'
called method 'getMessage'
[NEWRELIC] getMessage on queue main returned a message: 'goodbye'
[NEWRELIC] publish called on queue 'main' with message 'hello again'
called method 'publish'
[NEWRELIC] publish called on queue 'main' with message 'goodbye again'
called method 'publish'
[NEWRELIC] purge called on queue 'main'
called method 'purge'
called method 'subscribe'
[NEWRELIC] publish called on queue 'main' with message 'hello yet again'
called method 'publish'
called handler on queue 'main'
[NEWRELIC] subscribe on queue main returned a message: 'hello yet again'
[NEWRELIC] publish called on queue 'main' with message 'goodbye yet again'
called method 'publish'
called handler on queue 'main'
[NEWRELIC] subscribe on queue main returned a message: 'goodbye yet again'
called method 'getMessage'
[NEWRELIC] getMessage on queue main returned a message: 'undefined'
```

5. Navigate to [New Relic One](https://one.newrelic.com) > APM > Example Messaging App > Monitor > Distributed Tracing.
![DT View](./images/dt-view.png?raw=true "DT view")

6. Click a trace and you can see the messaging instrumentation recording relevant spans.
![Detailed trace](./images/dt-details.png?raw=true "Detailed Trace")

## Description

The application consists of the following files.

* [`nifty-messages.js`](./nifty-messages.js): a toy messaging app called Nifty Messages that exposes four prototypical methods, `publish`, `purge`, `subscribe`, and `getMessage`.
* [`index.js`](./index.js): a simple Express app that makes use of the toy messaging app.
* [`instrumentation.js`](./instrumentation.js): all of the New Relic instrumentation is in here. The `npm start` command loads this module first.
* [`newrelic.js`](./newrelic.js): a basic, sample New Relic configuration.

The instrumentation in `instrumentation.js` makes use of [`instrumentMessages`](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/api-guides/nodejs-agent-api/#instrumentMessages) and three relevant functions of the [messaging shim API](https://newrelic.github.io/node-newrelic/MessageShim.html):

* [`recordProduce`](https://newrelic.github.io/node-newrelic/MessageShim.html#recordProduce)
* [`recordConsume`](https://newrelic.github.io/node-newrelic/MessageShim.html#recordConsume)
* [`recordSubscribedConsume`](https://newrelic.github.io/node-newrelic/MessageShim.html#recordSubscribedConsume)

## Additional Configuration
If you are a New Relic employee and wanting to testing on a staging environment, add the following to the `npm start` command:

```sh
NEW_RELIC_HOST=staging-collector.newrelic.com
```
