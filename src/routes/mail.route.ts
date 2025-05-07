import { Router } from "express";
import { sendVerificationMail } from "../controllers/mail.controller";

const router = Router()

router.post('/verification', sendVerificationMail)

export default router;
