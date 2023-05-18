# New Relic Node.js logs in context Example

This project demonstrates [logs in context](https://docs.newrelic.com/docs/logs/logs-context/logs-in-context/) with New Relic by using a Node.js application and log enrichers.

The sample application has support for the two log enrichers: [@newrelic/winston-enricher](https://github.com/newrelic/newrelic-node-log-extensions/tree/main/packages/winston-log-enricher) and [@newrelic/pino-enricher](https://github.com/newrelic/newrelic-node-log-extensions/tree/main/packages/pino-log-enricher).  It also contains a container to run fluentd with the [fluent-plugin-newrelic](https://github.com/newrelic/newrelic-fluentd-output) to forward logs to New Relic One.

## Getting Started
**Note**: You must have [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.  The steps below are using [hey](https://github.com/rakyll/hey) to generate load on the sample app.

 1. Clone or fork this repository.
 1. Copy `.env.example` to `.env` and fill out the following keys:
    ```sh
    NEW_RELIC_LICENSE_KEY=<New Relic License Key>
    # By default the app is using pino + @newrelic/pino-enricher
    # If you want to use winston + @newrelic/winston-enricher add
    # WINSTON=1
    ```
 1. Build containers `docker-compose build`
 1. Start containers `docker-compose up -d`
 1. Make requests to the app
    ```sh
    hey -z 5m http://localhost:3000
    ```
 1. Navigate to [New Relic One](https://one.newrelic.com) > APM > (select an app) > Triage > Logs.
![logs in context landing](./images/logs-in-context-landing.png?raw=true "logs in context landing")

 1. Click a log line in the list view.
![log list with details](./images/log-list-with-details.png?raw=true "log list with details")

 1. View the details of the log entry and you can see `entity.*`, `span.id` and `trace.id` metadata added.
![log details](./images/log-details.png?raw=true "log details")

 1. Navigate to APM > (select an app) > Monitor > Distributed Trace.  Click a trace group > trace > See logs(top right of pane).
![distributed tracing](./images/dt-with-logs.png?raw=true "distributed tracing")

 1. You can now see all relevant logs for a given trace.
![logs for trace](./images/dt-with-log-details.png?raw=true "logs for trace")

### Additional Configuration

If you are a New Relic employee and wanting to testing on a staging environment, add the following:


```sh
NEW_RELIC_HOST=staging-collector.newrelic.com
NEW_RELIC_LOG_HOST=https://staging-log-api.newrelic.com/log/v1
```


