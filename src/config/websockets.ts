import { IncomingMessage } from 'http';
import { WebSocketServer } from 'ws';
import * as cookie from 'cookie';
import WebSocket from 'ws';
import { WS } from '../types/WS';
import { Instruction } from '../types/instruction';
import { wsPlayer } from '../types/wsPlayer';
import { Player } from '../models/Player';
import { handleFriendRequest, handleRemoveFriend } from '../controllers/ws.controller';
import { handleGameRequest, handleGameAccept } from '../controllers/game.controller';

export let wss: WebSocketServer | null = null;
export const clients: Map<string, WS> = new Map()
export const games: Map<string, [wsPlayer | null, wsPlayer | null]> = new Map()

// utils
export const parse = (data: WebSocket.RawData | Record<string, any>) => {
  if (Buffer.isBuffer(data) || typeof data === 'string') {
    return JSON.parse(data.toString());
  } else if (typeof data === 'object' && data !== null) {
    return JSON.stringify(data);
  }

  throw new Error('Unsupported data type');
};
export const sendMsg = (ws: WS, payload: Instruction) => {
  ws.send(parse(payload))
}

const onlinePlayerMessage = (ws: WS, reciverWs: WS) => {
  sendMsg(reciverWs, {
    action: "notify-only-is-online",
    payload: ws.user
  })
}
const offlinePlayerMessage = (ws: WS, reciverWs: WS) => {
  sendMsg(reciverWs, {
    action: "notify-only-is-not-online",
    payload: ws.user
  })
}
const notifyPlayerOnlineStatus = async (ws: WS, player: Player) => {
  // Cuando un usuario se conecta, revisa si sus amigos estan conectados para notificarlos
  const friends = player.friends as unknown as Player[]
  for(let i = 0; i < friends.length; i++) {
    if(!friends[i].isOnline) 
      continue

    const reciverWs = clients.get(friends[i].userId.toString())
    if(!reciverWs)
      continue
    
    if(player.isOnline)
      onlinePlayerMessage(ws, reciverWs)
    else
      offlinePlayerMessage(ws, reciverWs)
  }
}
const handleMessage = async (ws: WS, data: WebSocket.RawData) => {
  // En base a la accion, decide que funcion correr
  const instruction: Instruction = parse(data)

  switch(instruction.action) {
    case "add-friend":
      await handleFriendRequest(ws, instruction.payload)
    break;
    case "remove-friend":
      await handleRemoveFriend(ws, instruction.payload)
    break;
    case "game-request":
      handleGameRequest(ws, instruction.payload)
    break;
    case "game-accept":
      handleGameAccept(ws, instruction.payload)
    break;
  }
}


const handleConection = async (ws: WS, req: IncomingMessage) => {
  console.info("connected")

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : undefined
  const userId = cookies?.userId
  const player: Player = await Player.findOne({userId}).populate('friends')
  const playerId = player._id.toString()

  if(!userId) return

  ws.user = {
    playerId,
    username: player.username,
    image: player?.image
  }  
  
  player.isOnline = true;
  await player.save()
  await notifyPlayerOnlineStatus(ws, player)
  clients.set(playerId, ws)

  ws.on('message', (data) => handleMessage(ws, data))
  ws.on('close', () => {
    player.isOnline = false;
    player.save()
    .then(() => {
      notifyPlayerOnlineStatus(ws, player)
    }
      
    )
    console.info('disconected')
    clients.delete(playerId)
  })
}
export const createWSS = () => {
  if(!wss) {
    wss = new WebSocketServer({ noServer: true });
    wss.on("connection", handleConection)
  }

  return { wss, clients }
}
