import crypto from "crypto";
import { clients, games, sendMsg, randomGames } from '../config/websockets';
import { Player } from '../models/Player';
import { Game } from "../types/Game";
import { WS } from '../types/WS';



// MESSAGES
const sendMove = (reciverPlayer: WS, origin: number, destination: number, times: Record<string, any>) => {
  const payload = {origin, destination, times};
  sendMsg(reciverPlayer, {
    route: "game",
    action: "move",
    payload
  })
}
const cancelGameMessage = (ws1: WS, error: string) => {
  sendMsg(ws1, {
    route: "game",
    action: "notify-player-left", 
    payload: {error}, 
  })
}
const gameRequestMessage = (reciverWs: WS, payload: any, replyPayload: any) => {
  sendMsg(reciverWs, {
    route: "game",
    action: "notify-game-request",
    payload,
    replyAction: {
      route: "game",
      action: "game-accept", 
      payload: replyPayload
    }
  })
}
const startGameMessage = (ws1: WS, ws2: WS, gameId: string) => {
  const payload: any[] = [{...ws1.user, ...ws1.player!},{...ws2.user, ...ws2.player!}, gameId]

  sendMsg(ws1, {
    route: "game",
    action: "start-game",
    payload: [...payload, true]
  })
  sendMsg(ws2, {
    route: "game",
    action: "start-game",
    payload: [...payload, false]
  })
}
const drawRequestMessage = (ws: WS) => {
    sendMsg(ws, {
    route: "game",
    action: "notify-draw-request",
    payload: ws.user,
    replyAction: {
      route: "game",
      action: "draw-accept",
      payload: {e: "e"}
    }
  })
}
const drawGameMessage = (ws1: WS, ws2: WS) => {
  sendMsg(ws1, {
    route: "game",
    action: "draw-game",
    payload: {e: 'e'}
  })
  sendMsg(ws2, {
    route: "game",
    action: "draw-game",
    payload: {e: 'e'}
  })
}
const resignMessage = (ws: WS) => {
  sendMsg(ws, {
    route: "game",
    action: "resign",
    payload: ws.player?.isWhite ? "w" : "b"
  })
}

// LOGIC
const initClocks = (game: Game) => {
  game.times.bLastMove = Date.now()
}
const handleTimes = (game: Game) => {
  const color = game.isWhitesTurn ? "w" : 'b'
  const oppColor = game.isWhitesTurn ? "b" : 'w'
  const times = game.times
  const timeDeduccion = Math.floor((Date.now() - times[`${color}LastMove`]) / 1000)

  times[`${oppColor}LastMove`] = Date.now()
  times[`${oppColor}Time`] = times[`${oppColor}Time`] - timeDeduccion
}
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
const validateGameRequest = (reciverPlayer: Player | null, senderPlayer: Player | null, reciverWs: WS | null) => {
  if (!reciverPlayer || !senderPlayer) 
    return {isValid: false, message: "No se pudo encontrar al jugador"}

  if (!reciverWs) 
    return {isValid: false, message: "El jugador no está conectado"}

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
const createGame = (ws: WS, isRandom?: boolean) => {
  const gameId = crypto.randomBytes(8).toString("hex");
  const isWhite = Math.random() > 0.5 

  ws.player = {isWhite} 
  ws.gameId = gameId

  const playerWs1 = ws.player.isWhite ? ws : null
  const playerWs2 = ws.player.isWhite ? null : ws
  const game: Game = {
    gameId,
    players: [playerWs1, playerWs2],
    isWhitesTurn: true,
    times: {
      wTime: 600,
      bTime: 600,
      wLastMove: Date.now(),
      bLastMove: Date.now(),
    }
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
    initClocks(randomGame)
    startGameMessage(randomGame.players[0]!, randomGame.players[1]!, gameId)
  }

}
export const handleRandomGameRequestCancel = (ws: WS) => {
  const gameId = ws?.gameId
  if(gameId) {
    const randomGameIndex = randomGames.findIndex(game => game.gameId === gameId)
    randomGames.splice(randomGameIndex, 1)
    games.delete(gameId)
  }
}
export const handleGameRequest = async (ws: WS, {playerId}: Record<string, string>) => {
  const reciverPlayer: Player | null = await Player.findById(playerId)
  const senderPlayer: Player | null = await Player.findById(ws.user.playerId)
  const reciverWs = clients.get(playerId)
  
  const {isValid, message} = validateGameRequest(reciverPlayer, senderPlayer, reciverWs)
  
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
  initClocks(game)
  
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
export const handleMove = (ws: WS, {origin, destination}: {origin: number, destination: number}) => {
  const game = games.get(ws.gameId || "")
  if(!game) return

  
  const {isWhitesTurn} = game
  const isCorrectPlayer = ws.player?.isWhite == isWhitesTurn
  if(!isCorrectPlayer) return

  
  game.isWhitesTurn = !isWhitesTurn
  const senderPlayer = game.players[isWhitesTurn ? 0 : 1]
  const reciverPlayer = game.players[isWhitesTurn ? 1 : 0]
  if(!senderPlayer || !reciverPlayer) return

  handleTimes(game)
  sendMove(reciverPlayer, origin, destination, game.times)
}
export const handleResignNotification = (ws: WS) => {
  const gameId = ws.gameId
  if(!gameId) return
  
  const game = games.get(gameId)
  if(!game) return

  const oppPlayer = game.players[ws.player?.isWhite ? 1 : 0]
  if(!oppPlayer) return


  resignMessage(oppPlayer)
}
export const handleDrawRequest = (ws: WS) => {
  const gameId = ws.gameId
  if(!gameId) return
  
  const game = games.get(gameId)
  if(!game) return

  const oppPlayer = game.players[ws.player?.isWhite ? 1 : 0]
  if(!oppPlayer) return


  drawRequestMessage(oppPlayer)
}
export const handleDrawAccept = (ws: WS) => {
  const gameId = ws.gameId
  if(!gameId) return

  const game = games.get(gameId)
  if(!game) return

  const p2Index = ws.player?.isWhite ? 1 : 0
  const p2 = game.players[p2Index]

  if(!p2) return

  drawGameMessage(ws, p2)
}
export const handleGameEnded = (ws: WS) => {
  const gameId = ws.gameId
  if(!gameId) return

  games.delete(gameId)
}