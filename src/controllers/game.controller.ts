import { Player } from '../models/Player';
import { Instruction } from '../types/instruction';
import WebSocket from 'ws';
import { WS } from '../types/WS';
import { clients, games, sendMsg } from '../config/websockets';
import crypto from "crypto";
import { wsPlayer } from '../types/wsPlayer';
import mongoose from 'mongoose';

// MESSAGES
const gameRequestMessage = (ws: WS, reciverWs: WS) => {
  sendMsg(reciverWs, {
    action: "notify-game-request",
    payload: ws.user,
      replyAction: {
      action: "game-accept", 
      payload: {user: reciverWs.user}}
  })
}

// LOGIC
const createGame = (senderPlayer: Player) => {
  const gameId = crypto.randomBytes(8).toString("hex");

  const wsPlayer1: wsPlayer = {
    username: senderPlayer.username,
    id: senderPlayer._id.toString(),
    image: senderPlayer.image,
    isWhite: Math.random() > 0.5,
  }

  games.set(gameId, [wsPlayer1, null])
}

// ACTIONS
export const handleGameRequest = async (ws: WS, {playerId}: Record<string, string>) => {
  // userid es reciver
  const reciverId = new mongoose.Types.ObjectId(playerId);

  const reciverPlayer: Player | null = await Player.findById(reciverId)
  const senderPlayer: Player | null = await Player.findById(ws.user.playerId)

  if(!senderPlayer?.isOnline || !reciverPlayer?.isOnline) return
  createGame(senderPlayer)

  const reciverWs = clients.get(reciverPlayer._id.toString())
  if(!reciverWs) return
  gameRequestMessage(ws, reciverWs)
}
export const handleGameAccept = async (ws: WS, {playerId}: Record<string, string>) => {

}