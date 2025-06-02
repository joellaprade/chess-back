import { WS } from '../types/WS';
import { games, sendMsg } from '../config/websockets';


// MESSAGES
const sendMove = (reciverPlauer: WS, origin: number, destination: number) => {
  const payload = {origin, destination};
  sendMsg(reciverPlauer, {
    action: "start-game",
    payload
  })
}

// LOGIC

 
// ACTIONS
export const handleMove = (ws: WS, {origin, destination}: {origin: number, destination: number}) => {
const game = games.get(ws.gameId || "")
  if(!game) return
  
  const {isWhitesTurn} = game
  const isCorrectPlayer = ws.player?.isWhite == isWhitesTurn
  if(!isCorrectPlayer) return

  
  // reciver es null, game no se inicia correctamente
  const senderPlayer = game.players[isWhitesTurn ? 0 : 1]
  const reciverPlayer = game.players[isWhitesTurn ? 1 : 0]
  if(!senderPlayer || !reciverPlayer) return

  sendMove(reciverPlayer, origin, destination)
}