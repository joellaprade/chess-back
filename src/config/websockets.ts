import { IncomingMessage } from 'http';
import { WebSocketServer } from 'ws';
import * as cookie from 'cookie';
import { handleMessage, notifyPlayerOnlineStatus } from '../controllers/ws.controller';
import { WS } from '../types/WS';
import { Player } from '../models/Player';

export let wss: WebSocketServer | null = null;
export const clients: Map<string, WS> = new Map()

const handleConection = async (ws: WS, req: IncomingMessage) => {
  console.info("connected")

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : undefined
  const userId = cookies?.userId
  const player: Player = await Player.findOne({userId}).populate('friends')

  if(!userId) return

  ws.user = {
    userId,
    username: player.username,
    image: player?.image
  }  
  
  player.isOnline = true;
  await player.save()
  await notifyPlayerOnlineStatus(ws, player)
  clients.set(userId, ws)

  ws.on('message', (data) => handleMessage(ws, data))
  ws.on('close', () => {
    player.isOnline = false;
    player.save()
    .then((r: any) => {
      notifyPlayerOnlineStatus(ws, player)
    }
      
    )
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
