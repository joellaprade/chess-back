import WebSocket from 'ws';
import * as cookie from 'cookie';
import { IncomingMessage } from 'http';
import { WebSocketServer } from 'ws';

import { WS } from '../types/WS';
import { Instruction } from '../types/instruction';
import { Game } from '../types/Game';
import { Player } from '../models/Player';

import { handleFriendRequest, handleRemoveFriend, handleFriendRequestDenied, } from '../controllers/ws.controller';
import { 
  handleGameEnded, 
  handleResignNotification, 
  handleMove, 
  handleRandomGameRequest, 
  handleGameRequest, 
  handleGameAccept, 
  handleGameRequestDenied, 
  handleRandomGameRequestCancel, 
  handleDrawRequest, 
  handleDrawAccept
 } from '../controllers/game.controller';
import logger from './winston';

export let wss: WebSocketServer | null = null;
export const clients: Map<string, WS> = new Map()
export const inactiveClients: Map<string, NodeJS.Timeout> = new Map();
export const games: Map<string, Game> = new Map()
export const randomGames: Game[] = [];

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

// MESSAGES
const onlinePlayerMessage = (ws: WS, reciverWs: WS) => {
  sendMsg(reciverWs, {
    route: "homepage",
    action: "notify-only-is-online",
    payload: ws.user
  })
}
const offlinePlayerMessage = (ws: WS, reciverWs: WS) => {
  sendMsg(reciverWs, {
    route: "homepage",
    action: "notify-only-is-not-online",
    payload: ws.user
  })
}
const handleHomePageMessages = async (ws: WS, instruction: Instruction) => {
  switch(instruction.action) {
    case "add-friend":
      await handleFriendRequest(ws, instruction.payload)
    break;
    case "remove-friend": 
      await handleRemoveFriend(ws, instruction.payload)
    break;
    case "friend-denied":
      handleFriendRequestDenied(ws, instruction.payload)
    break;
  }  
}
const handleGameMessages = async (ws: WS, instruction: Instruction) => {
  switch(instruction.action) {
    case "move":
      handleMove(ws, instruction.payload)
    break
    case "reconnect":
      handleReconnect(ws, instruction.payload)
    break
    case "random-game-request":
      handleRandomGameRequest(ws)
    break;
    case "random-game-cancel":
      handleRandomGameRequestCancel(ws)
    break;
    case "game-request":
      handleGameRequest(ws, instruction.payload)
    break;
    case "game-accept":
      handleGameAccept(ws, instruction.payload)
    break;
    case "game-denied":
      handleGameRequestDenied(ws, instruction.payload)
    break;
    case "draw-request":
      handleDrawRequest(ws)
    break;
    case "draw-accept":
      handleDrawAccept(ws)
    break
    case "resign":
      handleResignNotification(ws)
    break;
    case "game-ended":
      handleGameEnded(ws)
    break
  }
}
const handleMessage = async (ws: WS, data: WebSocket.RawData) => {
  // En base a la accion, decide que funcion correr
  const instruction: Instruction = parse(data)
  console.info('ran message')
  switch(instruction.route) {
    case "homepage":
      handleHomePageMessages(ws, instruction)
    break;
    case "game":
      handleGameMessages(ws, instruction)
    break;
  }
}

// LOGIC
const handleGameStaleWs = (ws: WS) => {
  const oppIndex = ws.player?.isWhite ? 1 : 0
  const oppWs = games.get(ws.gameId || "")?.players[oppIndex]
  if(!oppWs) return

  inactiveClients.set(ws.user.playerId, setTimeout(() => {
    // buscar ws del oponente con gameId
    sendMsg(oppWs, {
      route: "game",
      action: "resign",
      payload: ws.player?.isWhite ? "b" : "w"
    })
  }, 10000))
  // dentro del timeout, tener logica para finalizar juego
}
const handleCloseWs = async (ws: WS) => {
  const player = await Player.findById(ws.user.playerId)
  if(!player) return
  player.isOnline = false;
  player.save()
  .then(() => {
    notifyPlayerOnlineStatus(ws, player)
    
    handleGameStaleWs(ws)
  })
  console.info('disconected')
  clients.delete(ws.user.playerId)
}
const notifyPlayerOnlineStatus = async (ws: WS, player: Player) => {
  // Cuando un usuario se conecta, revisa si sus amigos estan conectados para notificarlos
  const friends = player.friends as unknown as Player[]
  for(let i = 0; i < friends.length; i++) {
    if(!friends[i].isOnline) 
      continue

    const reciverWs = clients.get(friends[i]._id.toString())
    if(!reciverWs)
      continue

    if(player.isOnline)
      onlinePlayerMessage(ws, reciverWs)
    else
      offlinePlayerMessage(ws, reciverWs)
  }
}
const handleReconnect = (ws: WS, payload: any) => {
  const { gameId, userId } = payload
  const game = games.get(gameId)
  if(!game) return

  const [oldWs] = game.players.filter(p => p && p.userId === userId)
  if(!oldWs) return

  ws.player = oldWs.player
  ws.gameId = oldWs.gameId

  const playerIndex = oldWs.player?.isWhite ? 0 : 1
  game.players[playerIndex] = ws

  const timeout = inactiveClients.get(ws.user.playerId)
  if(!timeout) return

  clearTimeout(timeout)
  inactiveClients.get(ws.user.playerId)
}
const handleConection = async (ws: WS, req: IncomingMessage) => {
  console.info("WS Connected")

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : undefined
  const userId = cookies?.userId
  
  if(!userId) return
  console.log('has user id')
  let player: Player | null = await Player.findOne({userId}).populate('friends')
  if(!player) return
  console.log('has player')
  
  const playerId = player._id.toString()
  ws.userId = userId
  ws.user = {
    playerId,
    username: player.username,
    image: player?.image
  }  
  console.log('sendign msg')
  sendMsg(ws, {action: "notify-connected", payload: {e: 'e'}} as Instruction)
  
  player.isOnline = true;
  await player.save()
  await notifyPlayerOnlineStatus(ws, player)
  clients.set(playerId, ws)

  ws.on('message', (data) => {
    handleMessage(ws, data)
  })
  ws.on('close', async () => {
    handleCloseWs(ws)
  })
}
export const createWSS = () => {
  if(!wss) {
    wss = new WebSocketServer({ noServer: true });
    wss.on("connection", handleConection)
  }

  return { wss, clients }
}
 