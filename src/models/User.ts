import { Schema, model, models, InferSchemaType, Types } from "mongoose";

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  image: { type: String, required: true, default: "" },
  username: { type: String, required: true },
  password: { type: String, required: true },
});

export const User = models.User || model("User", userSchema);

export type User = InferSchemaType<typeof userSchema> & {
  _id: Types.ObjectId;
  save: () => Promise<void>
};
