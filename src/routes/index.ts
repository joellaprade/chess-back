import { Router } from "express";
import fileManager from "./fileManager.route"

const router = Router()

router.use('/file-manager', fileManager)

export default router;