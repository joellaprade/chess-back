// import { SomeModel } from "./SomeModel";
import { Model } from "mongoose"
import { User } from "./User"

const MODELS: Record<string, Model<any, {}, {}, {}, any, any>> = {
  User
}

export default MODELS