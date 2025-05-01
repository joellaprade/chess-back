import dotenv from 'dotenv'
dotenv.config();
import express from 'express'
import cors from "cors"
import cookieParser from "cookie-parser"
import helmet from "helmet"
import routes from "../routes/index"

const app = express()

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS

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

app.use('/express', routes)

export default app