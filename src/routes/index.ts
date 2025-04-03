import { Router } from "express";
import someRoutes from "./someRoutes"

const router = Router()

router.use('/some-routes', someRoutes)


export default router;