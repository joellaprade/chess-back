import { SomeModel } from "./SomeModel";
import { Model } from "mongoose"

const MODELS: Record<string, Model<any, {}, {}, {}, any, any>> = {
  SomeModel
}

export default MODELS