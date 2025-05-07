import { Router } from "express";
import fileManager from "./fileManager.route"
import user from "./user.route"
import mail from "./mail.route"

const router = Router()

router.use('/file-manager', fileManager)
router.use('/user', user)
router.use('/mail', mail)

export default router;