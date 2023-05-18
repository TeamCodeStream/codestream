## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

This repository exhibits some basic Nest.js features. It enables New Relic instrumentation by modifying `npm start` to the following command: `nest start -e 'node -r newrelic'`. Since the New Relic agent does not instrument native Nest.js logging, application log forwarding is enabled by enabling [nest-winston](https://www.npmjs.com/package/nest-winston). As an example of further instrumentation available, [Prisma](https://prisma.io/) is used as a datastore.

Configuration of the New Relic agent can be handled as usual, either by environment variables as exemplified [here](../sample.env) or by providing [a `newrelic.js` configuration file](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration/#methods-and-precedence).

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## License

Nest is [MIT licensed](LICENSE).
