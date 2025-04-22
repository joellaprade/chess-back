import express from 'express'
import cors from "cors"
import cookieParser from "cookie-parser"
import helmet from "helmet"
import dotenv from 'dotenv'
import routes from "../routes/index"

dotenv.config();

const app = express()

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ""


const corsOptions = {
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};

app.use(helmet())
app.use(cookieParser())
app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api', routes)

export default app