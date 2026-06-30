// import dns from 'node:dns';
// dns.setServers(['8.8.8.8', '8.8.4.4']);
// import 'dotenv.config.js';

import http from "http";
import app from "./app.js";
import { connectDB } from "./src/config/database.config.js";
import { PORT } from "./src/config/index.js";
import { attachSocket } from "./src/socket/index.js";

connectDB()
  .then(() => {
    const httpServer = http.createServer(app);
    const io = attachSocket(httpServer, { cors: { origin: true } });
    app.locals.io = io;

    httpServer.listen(PORT, (err) => {
      if (err) {
        console.log("Error starting server:", err);
        process.exit(1);
      }
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("Error connecting to database", err);
    process.exit(1);
  });
