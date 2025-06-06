import crypto from "crypto";

import { WS } from '../types/WS';

import { clients, games, sendMsg, randomGames } from '../config/websockets';
import { Player } from '../models/Player';
import { Game } from "../types/Game";

//messages
const cancelGameMessage = (ws1: WS, error: string) => {
  sendMsg(ws1, {
    route: "homepage",
    action: "notify-player-left", 
    payload: {error}, 
  })
}
const firstFriendRequestMessage = (ws: WS, reciverWs?: WS) => {
  if(!reciverWs) return
  
  sendMsg(reciverWs, {
    route: "homepage",
    action: "notify-friend-request", 
    payload: ws.user, 
    replyAction: {
      route: "homepage",
      action: "add-friend", 
      payload: {username: ws.user.username}}
    })
}
const newFriendMessage = (ws: WS, reciverWs?: WS) => {
  if(!reciverWs) return

  sendMsg(reciverWs, {
    route: "homepage",
    action: "notify-only-new-friend", 
    payload: ws.user, 
  })

  sendMsg(ws, {
    route: "homepage",
    action: "notify-only-new-friend", 
    payload: reciverWs.user, 
  })
}
const removedFriendMessage = (ws: WS, reciverWs?: WS) => {
  if(reciverWs){
    sendMsg(reciverWs, {
    route: "homepage",
      action: "notify-only-removed-friend",
      payload: ws.user
    })
  }

  sendMsg(ws, {
    route: "homepage",
    action: "notify-only-removed-friend",
    payload: reciverWs?.user
  })
}
const gameRequestMessage = (reciverWs: WS, payload: any, replyPayload: any) => {
  sendMsg(reciverWs, {
    route: "homepage",
    action: "notify-game-request",
    payload,
    replyAction: {
      route: "homepage",
      action: "game-accept", 
      payload: replyPayload
    }
  })
}
const startGameMessage = (ws1: WS, ws2: WS, gameId: string) => {
  const payload: any[] = [{...ws1.user, ...ws1.player!},{...ws2.user, ...ws2.player!}, gameId]

  sendMsg(ws1, {
    route: "homepage",
    action: "start-game",
    payload: [...payload, true]
  })
  sendMsg(ws2, {
    route: "homepage",
    action: "start-game",
    payload: [...payload, false]
  })
}

// LOGIC

const validateWs = (game: Game) => {
  const [ws1, ws2] = game.players
  
  if(!ws1 || !ws2) {
    const [activeWs] = [ws1, ws2].filter(ws => ws !== null)
    cancelGameMessage(activeWs, "No se pudo encontrar al segundo usuario")
    return false
  }

  if(ws1.userId === ws2.userId) {
    const [activeWs] = [ws1, ws2].filter(ws => ws !== null)
    cancelGameMessage(activeWs, "El usuario esta repetido")
    return false
  }

  const clientWs1 = clients.get(ws1?.user.playerId)
  const clientWs2 = clients.get(ws2?.user.playerId)

  if(!clientWs1 || !clientWs2) {
    const [activeWs] = [clientWs1, clientWs2].filter(ws => ws !== undefined)
    cancelGameMessage(activeWs, "El usuario se ha retirado de la plataforma")
    return false
  }

  return true
}
const insertWsInRightColor = (ws: WS, game: Game) => {
  let [p1Ws] = game.players.filter(p => p != null)
  if(!p1Ws?.player) return

  const isP1White = p1Ws.player.isWhite
  const p2Index = isP1White ? 1 : 0
  ws.player = {isWhite: !isP1White}

  game.players[p2Index] = ws

  return isP1White
}
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
const validateGameRequest = (reciverPlayer: Player | null, senderPlayer: Player | null) => {
  if (!reciverPlayer || !senderPlayer) 
    return {isValid: false, message: "No se pudo encontrar al jugador"}

  let isRepeated = false
  reciverPlayer.gameReqs.forEach(req => {
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
const createGame = (ws: WS, isRandom?: boolean) => {
  const gameId = crypto.randomBytes(8).toString("hex");
  const rand = Math.random()
  const isWhite = rand > 0.5 
  console.log(rand)

  ws.player = {isWhite} 
  ws.gameId = gameId

  const playerWs1 = ws.player.isWhite ? ws : null
  const playerWs2 = ws.player.isWhite ? null : ws
  const game: Game = {
    gameId,
    players: [playerWs1, playerWs2],
    isWhitesTurn: true
  }


  if(isRandom) randomGames.push(game)
  else games.set(gameId, game)
  
  return gameId
}
const clearGameRequests = async (sender: WS, players: [WS | null, WS | null]) => {
  // sender es el que recivio el req y esta enviando la aceptacion
  if(!players[0] || !players[1]) return

  const id0 = players[0].user.playerId
  const id1 = players[1].user.playerId
  const player0 = await Player.findById(id0)
  const player1 = await Player.findById(id1)

  if(!player0 || !player1) return

  if (sender.user.playerId == id0) {
    player0.gameReqs = player0.gameReqs.filter(
      (req: any) => !req.sender.equals(player1._id)
    );
    await player0.save();
  } else {
    player1.gameReqs = player1.gameReqs.filter(
      (req: any) => !req.sender.equals(player0._id)
    );
    await player1.save();
  }
}

// ACTIONS
export const handleFriendRequest = async (ws: WS, {username}: Record<string, any>) => {
  const reciverPlayer: Player | null = await Player.findOne({username})
  const senderPlayer: Player | null = await Player.findById(ws.user.playerId)
  const reciverWs = clients.get(reciverPlayer?._id.toString() || "")

  const {isValid, message} = validateAddRequest(reciverPlayer, senderPlayer)

  if(!isValid || !reciverPlayer || !senderPlayer) 
    return sendMsg(ws, {route: "homepage", action: "notify-only-error", payload: {message}})

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
  const reciverWs = clients.get(reciverPlayer?._id.toString() || "")

  if(!reciverPlayer || !senderPlayer) 
    return sendMsg(ws, {route: "homepage", action: "notify-only-error", payload: {message: "No se pudo encontrar al jugador"}})

  reciverPlayer.friends.pull(senderPlayer._id.toString())
  senderPlayer.friends.pull(reciverPlayer._id.toString())
  await reciverPlayer.save()
  await senderPlayer.save()

  removedFriendMessage(ws, reciverWs)
}
export const handleRandomGameRequest = async (ws: WS) => {
  const randomGame = randomGames[randomGames.length - 1]

  if(!randomGame){
    createGame(ws, true)
  } else {
    const gameId = randomGame.gameId
    ws.gameId = gameId

    const isFirstWsWhite = insertWsInRightColor(ws, randomGame)
    const firstWs = randomGame.players[isFirstWsWhite ? 0 : 1]

    randomGames.splice(randomGames.length - 1, 1)
    if(!firstWs) return
    if(!validateWs(randomGame)) return

    games.set(gameId, randomGame)
    startGameMessage(randomGame.players[0]!, randomGame.players[1]!, ws, gameId)
  }

}
export const handleGameRequest = async (ws: WS, {playerId}: Record<string, string>) => {
  const reciverPlayer: Player | null = await Player.findById(playerId)
  const senderPlayer: Player | null = await Player.findById(ws.user.playerId)
  const reciverWs = clients.get(playerId)
  
  const {isValid, message} = validateGameRequest(reciverPlayer, senderPlayer)
  
  if(!isValid || !reciverPlayer || !senderPlayer || !reciverWs) 
    return sendMsg(ws, {route: "homepage", action: "notify-only-error", payload: {message}})

  const gameId = createGame(ws)
  reciverPlayer.gameReqs.push({
    sender: senderPlayer._id,
    gameId
  })
  await reciverPlayer.save()
  gameRequestMessage(reciverWs, {...ws.user, gameId}, {gameId})
}
export const handleGameAccept = async (ws: WS, {gameId}: Record<string, string>) => {
  let game = games.get(gameId)
  if(!game) return
  
  ws.gameId = gameId
  insertWsInRightColor(ws, game)
  await clearGameRequests(ws, game.players)
  if(!validateWs(game)) {
    games.delete(gameId)
    return
  }
  startGameMessage(game.players[0]!, game.players[1]!, gameId)
}
export const handleGameRequestDenied = async (ws: WS, gameId: Record<string, string>) => {
  const senderPlayer: any = await Player.findById(ws.user.playerId)

  if(!senderPlayer) return

  senderPlayer.gameReqs = senderPlayer.gameReqs.filter(
    (req: any) => req.gameId !== gameId.gameId
  );

  senderPlayer.save()
}
export const handleFriendRequestDenied = async (ws: WS, playerId: Record<string, string>) => {
  const senderPlayer: any = await Player.findById(ws.user.playerId)

  if(!senderPlayer) return
  
  senderPlayer.friendReqs = senderPlayer.friendReqs.filter(
    (req: any) => req.username !== playerId.playerId
  );

  senderPlayer.save()
}
export const handleRandomGameRequestCancel = (ws: WS) => {
  const gameId = ws?.gameId
  if(gameId) {
    const randomGameIndex = randomGames.findIndex(game => game.gameId === gameId)
    randomGames.splice(randomGameIndex, 1)
    games.delete(gameId)
  }
}