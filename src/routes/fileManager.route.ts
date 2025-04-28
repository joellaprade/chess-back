import { updateUserProfilePicture } from "../controllers/fileManager.controller";
import { Router } from "express";
import multer from "multer"

const upload = multer({ dest: "uploads/" })
const router = Router()

router.post('/upload', upload.single('upload-input'), updateUserProfilePicture)

export default router;