import { Router } from "express";
import fileManager from "./fileManager.route"
import player from "./player.route"

const router = Router()

router.use('/file-manager', fileManager)
router.use('/player', player)

export default router;