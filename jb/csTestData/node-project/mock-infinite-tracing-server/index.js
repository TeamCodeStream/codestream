const protoLoader = require('@grpc/proto-loader')
const grpc = require('@grpc/grpc-js')
const pkgDef = protoLoader.loadSync('./inifinite-trace.proto', {
 keepCase: true,
 longs: String,
 enums: String,
 defaults: true,
 oneofs: true
});

const proto = grpc.loadPackageDefinition(pkgDef)
const traceApi = proto.com.newrelic.trace.v1

// Simply just reflect back the data getting passed from client stream
let spans = 0
const infiniteTraceServer = {
  recordSpan: function(call) {
    console.log('recordSpan')
    const { metadata } = call
    console.log('meta', metadata)
    call.on('data', (clientStream) => {
      spans++
      console.log(`got span ${clientStream.trace_id}`)
      console.log(`processed ${spans} spans thus far`)
      call.write({ messages_seen: 1 })
    })

    call.on('end', () => {
      call.end()
    })
  },
  recordSpanBatch: function(call) {
    console.log('recordSpanBatch')
    const { metadata } = call
    console.log('meta', metadata)
    call.on('data', (clientStream) => {
      console.log(`saw ${clientStream.spans.length} spans`)
      call.write({ messages_seen: clientStream.spans.length })
    })

    call.on('end', () => {
      call.end()
    })
  }
}

async function connect() {
  const server = new grpc.Server()
  const credentials = grpc.ServerCredentials.createInsecure()
  server.addService(traceApi.IngestService.service, infiniteTraceServer)
  await new Promise((resolve, reject) => {
    server.bindAsync('0.0.0.0:50051', credentials, (err, port) => {
      if (err) {
        reject(err)
      } else resolve(port)
    })
  })
  server.start()
  console.log('started at localhost:50051!')
}

connect()

