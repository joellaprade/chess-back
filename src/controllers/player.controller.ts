import { Request, Response } from "express";
import { Player } from "../models/Player";

export const getPlayer = async (req: Request, res: Response) => {
  const {username} = req.params
  const player: Player | null = await Player.find({username: {$regex: username, $options: 'i'}})
  if(!player) return
  
  delete (player as any).userId
  
  res.send(player)
}