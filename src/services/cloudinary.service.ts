import { cloudinary } from "../config/cloudinary"

export const handleCloudlyUpload = async (filePath: string) => {
    const result = await cloudinary.uploader.upload(filePath)
    return result.secure_url;
}