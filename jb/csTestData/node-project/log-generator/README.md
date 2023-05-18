# Log Generator
This utility was designed to generate logs for winston or pino.  It can be used to do performance testing of the application logging in agent.

## Getting Started

**Note**: You must have Node.js installed and a New Relic license key.

### Install Node.js with nvm

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
nvm install 16
```


### Prepare Utility
By default this utility will enrich and forward logs to New Relic One staging environment.

```sh
npm ci
```

The top of the utility contains a series of environment variables that can change the behavior Edit `log-generator.js` and fill in

```sh
process.env.NEW_RELIC_APP_NAME = 'log-generator'
// process.env.NEW_RELIC_LICENSE_KEY = <your-license-key>
```


## Run Utility

```sh
node log-generator.js
```

You can change the size, interval, count, duration and log library via CLI flags.

```sh
node log-generator.js --help
```

```sh
Options:
      --version   Show version number                                  [boolean]
  -l, --logtype   which logger to use
                      [string] [choices: "winston", "pino"] [default: "winston"]
  -i, --interval  interval in milliseconds to wait between each round of log
                  messages                               [number] [default: 200]
  -c, --count     number of log messages to produce at each round
                                                           [number] [default: 1]
  -s, --size      size of each log message, in characters[number] [default: 128]
  -d, --duration  how many seconds to run for (use 0 seconds to run forever)
                                                           [number] [default: 0]
      --help      Show help                                            [boolean]
```
