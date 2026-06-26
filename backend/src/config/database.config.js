// import mongoose from "mongoose";
// import { MONGODB_URL } from "./index.js";

// export const connectDB = async () => {
//   let client = await mongoose.connect(MONGODB_URL);
//   console.log("MongoDB connected to ", client.connection.host);
// };


import mongoose from "mongoose";
import { MONGODB_URL } from "./index.js";

export const connectDB = async () => {
  try {
    if (!MONGODB_URL) {
      throw new Error(
        "Missing MongoDB connection string. Set MONGODB_URL, MONGO_URI, or DATABASE_URL."
      );
    }

    const client = await mongoose.connect(MONGODB_URL);
    console.log("MongoDB connected to", client.connection.host);
  } catch (error) {
    console.log("Error connecting to database", error);
    throw error;
  }
};
