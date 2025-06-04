import { getPlayer } from "../controllers/player.controller";
import { Router } from "express";

const router = Router()

router.get('/get-player/:username', getPlayer)

export default router;