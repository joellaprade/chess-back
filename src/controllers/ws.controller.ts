import { clients, parse, sendMsg } from '../config/websockets';
import { Player } from '../models/Player';
import { Instruction } from '../types/instruction';
import WebSocket from 'ws';
import { WS } from '../types/WS';

export const handleMessage = async (ws: WS, data: WebSocket.RawData) => {
  const instruction: Instruction = parse(data)

  switch(instruction.action) {
    case "add-friend":
      await addFriend(ws, instruction.data)
    break;

  }
}

const addFriend = async (ws: WS, {username}: Record<string, any>) => {
  const reciverPlayer: Player | null = await Player.findOne({username})
  const senderPlayer: Player | null = await Player.findOne({userId: ws.userId})

  if (!reciverPlayer || !senderPlayer) 
    return sendMsg(ws, {message: "user couldn't be found"})

  reciverPlayer.friendReqs.push(senderPlayer._id)
  await reciverPlayer.save()

  if(reciverPlayer.isOnline) {
    const reciverWs = clients.get(reciverPlayer.userId.toString())
    if(reciverWs) 
      sendMsg(reciverWs, {message: "Notif that u where added"})
  }
} 
