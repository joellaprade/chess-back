import dotenv from 'dotenv'
dotenv.config();
import app from './config/app'
import { createWSS } from './config/websockets';
import connectDB from './config/database'
import http from "http";
import {initCloudinary} from "./config/cloudinary"


const PORT = process.env.PORT || 8000
const server = http.createServer(app)
const { wss } = createWSS()
initCloudinary();

connectDB().then(() => {
  server.listen(PORT, () => {
    console.info(`Listening to port: ${PORT}`)
  })

  server.on('upgrade', (req, socket, head) => {
    console.log('upgrading')
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req)
    })
  })
})
