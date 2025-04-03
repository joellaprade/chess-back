import app from './config/app'
import { createWSS } from './config/websockets';
import connectDB from './config/database'
import http from "http";

const PORT = process.env.PORT || 8000
const server = http.createServer(app)
const { wss } = createWSS()

connectDB().then(() => {
  server.listen(PORT, () => {
    console.info(`Listening to port: ${PORT}`)
  })

  server.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req)
    })
  })
})
