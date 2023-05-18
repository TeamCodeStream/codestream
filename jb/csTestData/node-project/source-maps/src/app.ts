import express from 'express'
import catRoutes from './routes/cats'

const app = express()

app.use('/cats', catRoutes)

export default app
