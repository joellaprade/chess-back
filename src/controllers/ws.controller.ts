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

export const sendMsg = (ws: WS, payload: Instruction) => {
  ws.send(parse(payload))
}

export const handleMessage = async (ws: WS, data: WebSocket.RawData) => {
  const instruction: Instruction = parse(data)

  switch(instruction.action) {
    case "add-friend":
      await handleFriendRequest(ws, instruction.payload)
    break;

  }
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

const notifyReciver = async (ws: WS, reciverPlayer: Player) => {
  const senderUser: User | null = await User.findById(ws.userId)
  const reciverWs = clients.get(reciverPlayer!.userId.toString())
  if(reciverWs && senderUser) {
    const senderData = {
      username: senderUser.username,
      image: senderUser.image,
    }
    sendMsg(reciverWs, {
      action: "notify-reciver", 
      payload: senderData, 
      replyAction: {
        action: "add-friend", 
        payload: {username: senderData.username}}
      } as Instruction)
  }
}

const addFriends = async (reciverPlayer: Player, senderPlayer: Player) => {
  senderPlayer.friendReqs.pull(reciverPlayer._id)

  senderPlayer.friends.push(reciverPlayer._id)
  reciverPlayer.friends.push(senderPlayer._id)

  await senderPlayer.save()
  await reciverPlayer.save()
}

const handleFriendRequest = async (ws: WS, {username}: Record<string, any>) => {
  const reciverPlayer: Player | null = await Player.findOne({username})
  const senderPlayer: Player | null = await Player.findOne({userId: ws.userId})

  const {isValid, message} = validateAddRequest(reciverPlayer, senderPlayer)

  if(!isValid || (!reciverPlayer || !senderPlayer)) 
    return sendMsg(ws, {action: "message", payload: message})

  if (senderPlayer.friendReqs.some((id: object) => 
    id.toString() == reciverPlayer._id.toString()
  )) {
    await addFriends(reciverPlayer, senderPlayer)
  } else {
    reciverPlayer.friendReqs.push(senderPlayer._id)
    await reciverPlayer.save()
    notifyReciver(ws, reciverPlayer)
  }
} 