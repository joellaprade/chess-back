import crypto from "crypto";

import { WS } from '../types/WS';

import { clients, games, sendMsg, wss } from '../config/websockets';
import { Player } from '../models/Player';

//messages
const firstFriendRequestMessage = (ws: WS, reciverWs?: WS) => {
  if(!reciverWs) return
  
  sendMsg(reciverWs, {
    action: "notify-friend-request", 
    payload: ws.user, 
    replyAction: {
      action: "add-friend", 
      payload: {username: ws.user.username}}
    })
}
const newFriendMessage = (ws: WS, reciverWs?: WS) => {
  if(!reciverWs) return

  sendMsg(reciverWs, {
    action: "notify-only-new-friend", 
    payload: ws.user, 
  })

  sendMsg(ws, {
    action: "notify-only-new-friend", 
    payload: reciverWs.user, 
  })
}
const removedFriendMessage = (ws: WS, reciverWs?: WS) => {
  if(reciverWs){
    sendMsg(reciverWs, {
      action: "notify-only-removed-friend",
      payload: ws.user
    })
  }

  sendMsg(ws, {
    action: "notify-only-removed-friend",
    payload: reciverWs?.user
  })
}
const gameRequestMessage = (reciverWs: WS, payload: any, replyPayload: any) => {
  sendMsg(reciverWs, {
    action: "notify-game-request",
    payload,
    replyAction: {
      action: "game-accept", 
      payload: replyPayload
    }
  })
}
const startGameMessage = (ws1: WS, ws2: WS, gameId: string) => {
  const payload: any[] = [{...ws1.user, ...ws1.player!},{...ws2.user, ...ws2.player!}, gameId]
  sendMsg(ws1, {
    action: "start-game",
    payload: [...payload, true]
  })
  sendMsg(ws2, {
    action: "start-game",
    payload: [...payload, false]
  })
}

// LOGIC
const validateAddRequest = (reciverPlayer: Player | null, senderPlayer: Player | null) => {
  if (!reciverPlayer || !senderPlayer) 
    return {isValid: false, message: "No se pudo encontrar al jugador"}

  let isFriend = false
  reciverPlayer.friends.forEach(friend => {
    if (friend._id.toString() === senderPlayer._id.toString()) {
      isFriend = true
    }
  })

  if(isFriend) 
    return {isValid: false, message: "Este usuario ya ha sido agregado como amigo"}

  let isRepeated = false
  reciverPlayer.friendReqs.forEach(req => {
    if (req._id.toString() === senderPlayer._id.toString()) {
      isRepeated = true
    }
  })
  
  if(isRepeated)     
    return {isValid: false, message: "Ya se le ha mandado invitacion a este jugador"}

  return {isValid: true, message: ""}
}
const addFriends = async (reciverPlayer: Player, senderPlayer: Player) => {
  senderPlayer.friendReqs.pull(reciverPlayer._id)

  senderPlayer.friends.push(reciverPlayer._id)
  reciverPlayer.friends.push(senderPlayer._id)

  await senderPlayer.save()
  await reciverPlayer.save()
}
const createGame = (ws: WS) => {
  const gameId = crypto.randomBytes(8).toString("hex");

  ws.player = {isWhite: Math.random() > 0.5} 
  ws.gameId = gameId

  const playerWs1 = ws.player.isWhite ? ws : null
  const playerWs2 = ws.player.isWhite ? null : ws

  games.set(gameId, {
    gameId,
    players: [playerWs1, playerWs2],
    isWhitesTurn: true
  })

  return gameId
}

// ACTIONS
export const handleFriendRequest = async (ws: WS, {username}: Record<string, any>) => {
  const reciverPlayer: Player | null = await Player.findOne({username})
  const senderPlayer: Player | null = await Player.findById(ws.user.playerId)
  const reciverWs = clients.get(reciverPlayer?.userId.toString() || "")

  const {isValid, message} = validateAddRequest(reciverPlayer, senderPlayer)

  if(!isValid || !reciverPlayer || !senderPlayer) 
    return sendMsg(ws, {action: "error", payload: {message}})

  if (senderPlayer.friendReqs.some((id: object) => 
    id.toString() == reciverPlayer._id.toString()
  )) {
    await addFriends(reciverPlayer, senderPlayer)
    newFriendMessage(ws, reciverWs)
  } else {
    reciverPlayer.friendReqs.push(senderPlayer._id)
    await reciverPlayer.save()
    firstFriendRequestMessage(ws, reciverWs)
  }
} 
export const handleRemoveFriend = async (ws: WS, {username}: Record<string, any>) => {
  const reciverPlayer: Player | null = await Player.findOne({username}) 
  const senderPlayer: Player | null = await Player.findById(ws.user.playerId)
  const reciverWs = clients.get(reciverPlayer?.userId.toString() || "")

  if(!reciverPlayer || !senderPlayer) 
    return sendMsg(ws, {action: "error", payload: {message: "No se pudo encontrar al jugador"}})

  reciverPlayer.friends.pull(senderPlayer._id.toString())
  senderPlayer.friends.pull(reciverPlayer._id.toString())
  await reciverPlayer.save()
  await senderPlayer.save()

  removedFriendMessage(ws, reciverWs)
}
export const handleGameRequest = async (ws: WS, {playerId}: Record<string, string>) => {
  const reciverWs = clients.get(playerId)
  if(!reciverWs) return

  const gameId = createGame(ws)

  // SET COOKIE
  gameRequestMessage(reciverWs, ws.user, {gameId})
}
export const handleGameAccept = async (ws: WS, {gameId}: Record<string, string>) => {
  let game = games.get(gameId)
  if(!game) return
  
  let [senderWs] = game.players.filter(p => p != null)
  if(!senderWs?.player) return
  
  const isP1White = senderWs.player.isWhite
  const p2Index = isP1White ? 1 : 0
  ws.player = {isWhite: isP1White}

  game.players[p2Index] = ws


  startGameMessage(game.players[0]!, game.players[1]!, gameId)
}
