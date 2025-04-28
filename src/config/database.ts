import mongoose from "mongoose";

const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI || "";
  try {
    await mongoose.connect(MONGO_URI)
    
  } catch (e) {
    console.error(`Error connecting to DB: ${e}`)
    process.exit(1)
  } 
}

export default connectDB