import express from 'express'
const { PORT = '3000', HOST = 'localhost' } = process.env
import parseJson from 'parse-json'
import normalizeUrl from 'normalize-url'

const app = express()
app.listen(PORT, HOST, function() {
  const addr = this.address()
  const host = addr.family === 'IPv6' ? `[${addr.address}]` : addr.address
  console.log('Server started at http://%s:%s', host, addr.port) 
})

app.get('/', function(req, res) {
  res.send('Hello world')
})

app.get('/user/:id', function(req, res) {
  res.send(`Reflected back the user id of ${req.params.id}`)
})

app.get('/instrumentation-example', function(req, res) {
  const instrumentedUrl = normalizeUrl('test:me@example.com')
  const json = '{"key": "value"}'
  const instrumentedJson = parseJson(json)
  instrumentedJson.url = instrumentedUrl
  res.send(instrumentedJson)
})
