import { Request, Response } from "express"
import { handleCloudlyUpload } from "../services/cloudinary.service"
import { User } from "../models/User"
import { Session } from "../models/Session"


export const updateUserProfilePicture = async (req: Request, res: Response) => {
  const filePath = req.file?.path
  let imageUrl = "";
  console.log(req.cookies)
  const userId: string = req.cookies.userId
  const user: User | null = await User.findById(userId)
  const session: Session | null = await Session.findOne({userId})

  if(filePath && user && session) {
    // imageUrl = await handleCloudlyUpload(filePath)
    user.image = imageUrl
    session.user.image = imageUrl
    await user.save();
    await session.save();
  }

  res.send({message: "success"})
}