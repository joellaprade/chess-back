import { Request, Response } from "express";
import { User } from "../models/User";

export const getUser = async (req: Request, res: Response) => {
  const {username} = req.params
  const user = await User.find({username: {$regex: username, $options: 'i'}})

  res.send(user)
}