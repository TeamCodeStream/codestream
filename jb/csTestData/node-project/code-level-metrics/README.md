# Code Level Metrics Demo

This is an example application used to test the integration between the [New Relic Node.js agent](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/install-nodejs-agent/) and [CodeStream](https://www.codestream.com/). Along with an Express.js application bootstrapped with agent, it will also continuously make requests to the relevant endpoints.  

## Getting started

**Note**: You must have [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.  The steps below are using [hey](https://github.com/rakyll/hey) to generate load on the sample app.

 1. Clone or fork this repository.
 1. Copy `sample.env` to `.env` and fill out the following keys:
    ```sh
    NEW_RELIC_LICENSE_KEY=<New Relic License Key>
    ```
 1. Start containers `docker-compose up -d --build`

### Additional Configuration

If you are a New Relic employee and wanting to testing on a staging environment, add the following:

```sh
NEW_RELIC_HOST=staging-collector.newrelic.com
```



