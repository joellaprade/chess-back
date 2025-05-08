import { Router } from "express";
import fileManager from "./fileManager.route"
import user from "./user.route"

const router = Router()

router.use('/file-manager', fileManager)
router.use('/user', user)

export default router;