import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI)
    
  } catch (e) {
    console.error(`Error connecting to DB: ${e}`)
    process.exit(1)
  } 
}

export default connectDB