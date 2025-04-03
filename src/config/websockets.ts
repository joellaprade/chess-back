import { IncomingMessage } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import * as cookie from 'cookie';

export let wss: WebSocketServer | null = null;
export const clients: Map<string, WebSocket> = new Map()

const handleConection = (ws: WebSocket, req: IncomingMessage) => {
  console.info("connected")

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : undefined
  const userId = cookies?.userId || 'guest'

  clients.set(userId, ws)

  ws.on('close', () => {
    console.info('disconected')
    clients.delete(userId)
  })
}

export const createWSS = () => {
  if(!wss) {
    wss = new WebSocketServer({ noServer: true });
    wss.on("connection", handleConection)
  }

  return { wss, clients }
}
