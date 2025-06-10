import { clients, sendMsg } from '../config/websockets';
import { WS } from '../types/WS';
import { Player } from '../models/Player';

//messages
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
export const handleFriendRequestDenied = async (ws: WS, playerId: Record<string, string>) => {
  const senderPlayer: any = await Player.findById(ws.user.playerId)

  if(!senderPlayer) return
  
  senderPlayer.friendReqs = senderPlayer.friendReqs.filter(
    (req: any) => req.username !== playerId.playerId
  );

  senderPlayer.save()
}
