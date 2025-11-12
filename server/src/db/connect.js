import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function connect() {
  try {
    const res = await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB Atlas successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
  }
}

export default connect;
