import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/collab_notes";
    console.log("🔌 Connecting to:", uri.replace(/\/\/.*:.*@/, "//***:***@"));
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected successfully to:", mongoose.connection.name);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;