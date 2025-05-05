import { clients } from '../config/websockets';
import { Player } from '../models/Player';
import { Instruction } from '../types/instruction';
import WebSocket from 'ws';
import { WS } from '../types/WS';
import { ObjectId } from 'mongodb';

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
export const notifyPlayerOnlineStatus = async (ws: WS, player: Player) => {
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
export const handleMessage = async (ws: WS, data: WebSocket.RawData) => {
  const instruction: Instruction = parse(data)

  switch(instruction.action) {
    case "add-friend":
      await handleFriendRequest(ws, instruction.payload)
    break;
    case "remove-friend":
      await handleRemoveFriend(ws, instruction.payload)
    break;
  }
}


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

// actions
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
const handleFriendRequest = async (ws: WS, {username}: Record<string, any>) => {
  const reciverPlayer: Player | null = await Player.findOne({username})
  const senderPlayer: Player | null = await Player.findOne({userId: ws.user.userId})
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
const handleRemoveFriend = async (ws: WS, {username}: Record<string, any>) => {
  const reciverPlayer: Player | null = await Player.findOne({username}) 
  const senderPlayer: Player | null = await Player.findOne({userId: ws.user.userId})
  const reciverWs = clients.get(reciverPlayer?.userId.toString() || "")

  if(!reciverPlayer || !senderPlayer) 
    return sendMsg(ws, {action: "error", payload: {message: "No se pudo encontrar al jugador"}})

  reciverPlayer.friends.pull(senderPlayer._id.toString())
  senderPlayer.friends.pull(reciverPlayer._id.toString())
  await reciverPlayer.save()
  await senderPlayer.save()

  removedFriendMessage(ws, reciverWs)
}