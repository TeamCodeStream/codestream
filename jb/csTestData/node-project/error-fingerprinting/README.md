# Error Fingerprinting with setErrorGroupCallback

## Overview

`newrelic.setErrorGroupCallback` provides a way for you to customize the `error.group.name` attribute of errors that are captured by the agent. This attribute controls how the Errors Inbox functionality groups similar errors together.

`newrelic.setErrorGroupCallback` accepts one argument: a synchronous callback function. The callback function can accept an object argument, which contains metadata associated with an individual error. The object passed to the callback function has the following shape:

```js
{
  error: Error,
  customAttributes: Object,
  'request.uri': String,
  'http.statusCode': String,
  'http.method': String,
  'error.expected': Boolean
}
```

If the callback function returns a non-empty string, that string will be used as the Error Group name in Errors Inbox. If the callback function returns something other than a string, or an empty string, the `error.group.name` attribute will not be added to the Error.

Finally, if `newrelic.setErrorGroupCallback` is invoked multiple times, the previous callback function will be overwritten. There can be only one active callback function.

**Example Usage**
```js
const newrelic = require('newrelic')

newrelic.setErrorGroupCallback(function exampleCallback(metadata) {
  if (metadata['http.statusCode'] === '400') {
    return 'Bad Input'
  }

  if (metadata.error?.message.match(/Application Error/) {
    return 'Application Error'
  }
})
```

## Example App

**Running the app**
1. `export NEW_RELIC_LICENSE_KEY=<your-key-here>`
2. `npm run start`
3. `npm run traffic`

You can now log in to the New Relic UI and observe errors generated in the `Errors Inbox` page.
