import newrelic from 'newrelic'
export default function() {
  newrelic.instrument('parse-json', function(shim, parseJson, modName) {
    shim.wrap(parseJson, 'default', function wrapParseJson(shim, orig) {
      return function wrappedParsedJson() {
        // call original parseJson function and get result
        const result = orig.apply(this, arguments)
        // apppend a key of `instrumented`
        result.instrumented = true
        return result
      }
    })
  })
}
