import 'dotenv/config'
import express from 'express'
import { clerkMiddleware } from '@clerk/express'

const app = express()
const PORT = 3000

app.use(clerkMiddleware())

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`)
})