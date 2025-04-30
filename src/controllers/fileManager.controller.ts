import { Request, Response } from "express"
import { handleCloudlyUpload } from "../services/cloudinary.service"
import { User } from "../models/User"
import { Session } from "../models/Session"


export const updateUserProfilePicture = async (req: Request, res: Response) => {
  const filePath = req.file?.path
  let imageUrl = "https://cdn.esawebb.org/archives/images/screen/carinanebula3.jpg";
  // let imageUrl = "https://res.cloudinary.com/dd86ogsbh/image/upload/v1745984447/bdbzs0xmpshrddhjxbpg.jpg";
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
    console.log(user)
  }

  res.send({message: "success"})
}