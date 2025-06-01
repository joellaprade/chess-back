import { Schema, model, models, InferSchemaType, Types } from "mongoose";

const sessionSchema = new Schema({
  sessionToken: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  playerId: { type: String, required: true },
  user: {
    required: true,
    type: {
      name: { type: String, required: true },
      username: { type: String, required: true },
      email: { type: String, required: true },
      image: { type: String, default: "" },
    },
  },
  createdAt: {
    type: Date,
    default: new Date(Date.now()),
  },
  expiresAfter: {
    type: Date,
    index: { expires: 3600 },
    default: () => new Date(Date.now() + 3600 * 24),
  },
});

export const Session = models.Session || model("Session", sessionSchema);
export type Session = InferSchemaType<typeof sessionSchema> & {
  _id: Types.ObjectId;
};
