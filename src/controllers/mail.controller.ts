import { Request, Response } from "express"
import { sendMail } from "../config/mail"

export const sendVerificationMail = (req: Request, res: Response) => {
  const {email} = req.body;
  const randomNum = Math.random() * 1000
  sendMail(email, "Verifica Tu Correo", `https://10.45.1.112/${randomNum}`)
}