import { IncomingMessage } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import * as cookie from 'cookie';
import { handleMessage } from '../controllers/ws.controller';
import { WS } from '../types/WS';
import { Player } from '../models/Player';

export let wss: WebSocketServer | null = null;
export const clients: Map<string, WS> = new Map()

export const parse = (data: WebSocket.RawData | Record<string, any>) => {
  if (Buffer.isBuffer(data) || typeof data === 'string') {
    return JSON.parse(data.toString());
  } else if (typeof data === 'object' && data !== null) {
    return JSON.stringify(data);
  }

  throw new Error('Unsupported data type');
};

export const sendMsg = (ws: WS, data: Record<string, any>) => {
  console.log(ws, data)
  ws.send(parse(data))
}

export const setIsActive = async (ws: WS, isActive: boolean) => {
  const player: Player | null = await Player.findOne({userId: ws.userId})

  if (player){
    player.isOnline = isActive;
    await player.save()
  } 
}

const handleConection = async (ws: WS, req: IncomingMessage) => {
  console.info("connected")

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : undefined
  const userId = cookies?.userId

  if(!userId) return
  ws.userId = userId
  clients.set(userId, ws)

  await setIsActive(ws, true)

  ws.on('message', (data) => handleMessage(ws, data))
  ws.on('close', () => {
    setIsActive(ws, false)
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
