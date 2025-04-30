import { getUser } from "../controllers/user.controller";
import { Router } from "express";

const router = Router()

router.get('/get-user/:username', getUser)

export default router;