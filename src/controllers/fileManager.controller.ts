import { Request, Response } from "express"
import { cloudinary } from "../config/cloudinary"
import { handleCloudlyUpload } from "../services/cloudinary.service"
import { User } from "../models/User"


export const updateUserProfilePicture = async (req: Request, res: Response) => {
  const filePath = req.file?.path
  let imageUrl: string | null = null;
  const userId = req.cookies.userId
  const user: User | null = await User.findById(userId)
  
  if(filePath && user) {
    imageUrl = await handleCloudlyUpload(filePath)
    user.image = imageUrl
    await user.save();
    console.log(user)
  }

  res.send({message: "success"})
}