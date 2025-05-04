import { Request, Response } from "express"
import { handleCloudlyUpload } from "../services/cloudinary.service"
import { User } from "../models/User"
import { Session } from "../models/Session"
import { Player } from "../models/Player"


export const updateUserProfilePicture = async (req: Request, res: Response) => {
  const filePath = req.file?.path
  let imageUrl = "";
  const userId: string = req.cookies.userId
  const user: User | null = await User.findById(userId)
  const session: Session | null = await Session.findOne({userId})
  const player: Player | null = await Player.findOne({userId})

  if(filePath && user && session && player) {
    imageUrl = await handleCloudlyUpload(filePath)
    user.image = imageUrl
    session.user.image = imageUrl
    player.image = imageUrl
    await user.save();
    await session.save();
    await player.save();
  }

  res.send({message: "success"})
}