import { clients } from '../config/websockets';
import { Player } from '../models/Player';
import { Instruction } from '../types/instruction';
import WebSocket from 'ws';
import { WS } from '../types/WS';
import { User } from '../models/User';

export const parse = (data: WebSocket.RawData | Record<string, any>) => {
  if (Buffer.isBuffer(data) || typeof data === 'string') {
    return JSON.parse(data.toString());
  } else if (typeof data === 'object' && data !== null) {
    return JSON.stringify(data);
  }

  throw new Error('Unsupported data type');
};

export const sendMsg = (ws: WS, data: Instruction) => {
  ws.send(parse(data))
}

export const handleMessage = async (ws: WS, data: WebSocket.RawData) => {
  const instruction: Instruction = parse(data)

  switch(instruction.action) {
    case "add-friend":
      await addFriend(ws, instruction.data)
    break;

  }
}

const validateAddRequest = (reciverPlayer: Player | null, senderPlayer: Player | null) => {
  if (!reciverPlayer || !senderPlayer) 
    return {isValid: false, message: "No se pudo encontrar al jugador"}

  // let isRepeated = false
  // reciverPlayer.friendReqs.forEach(req => {
  //   if (req._id.toString() === senderPlayer._id.toString()) {
  //     isRepeated = true
  //   }
  // })
  
  // if(isRepeated)     
  //   return {isValid: false, message: "Ya se le ha mandado invitacion a este jugador"}

  return {isValid: true, message: ""}
}

const notifyReciver = async (ws: WS, reciverPlayer: Player) => {
  const senderUser: User | null = await User.findById(ws.userId)
  const reciverWs = clients.get(reciverPlayer!.userId.toString())
  if(reciverWs && senderUser) {
    const senderData = {
      username: senderUser.username,
      image: senderUser.image,
    }
    sendMsg(reciverWs, {action: "notify-reciver", data: senderData} as Instruction)
  }
}

const addFriend = async (ws: WS, {username}: Record<string, any>) => {
  const reciverPlayer: Player | null = await Player.findOne({username})
  const senderPlayer: Player | null = await Player.findOne({userId: ws.userId})

  const {isValid, message} = validateAddRequest(reciverPlayer, senderPlayer)

  if(isValid || (!reciverPlayer || !senderPlayer)) 
    return sendMsg(ws, {action: "message", data: message})

  reciverPlayer.friendReqs.push(senderPlayer._id)
  await reciverPlayer.save()

  notifyReciver(ws, reciverPlayer)
} 
