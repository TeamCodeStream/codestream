import app from './app'

const port = process.env.PORT ?? 3000

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`)
})
