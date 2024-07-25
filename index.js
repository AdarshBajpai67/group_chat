require("dotenv").config();

const express = require("express");
const jwt = require("jsonwebtoken");
const { createServer } = require("http");
const path = require("path");
const { Server } = require("socket.io");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { availableParallelism } = require("node:os");
const cluster = require("node:cluster");
const { createAdapter, setupPrimary } = require("@socket.io/cluster-adapter");
const mongoose = require("mongoose");

const JWT_SECRET = process.env.JWT_SECRET;

const connectToDB = require("./src/config/mongoDB");
const connectToCloudinary = require("./src/config/cloudinary");

const authRoutes = require("./src/routes/authRoutes");
const groupRoutes = require("./src/routes/groupRoutes");
const userRoutes = require("./src/routes/userRoutes");
const User = require("./src/models/userModel");
const Group = require("./src/models/groupModel");

if (cluster.isPrimary) {
  const numProcesses = availableParallelism();
  for (let i = 0; i < numProcesses; i++) {
    cluster.fork({
      PORT: 3000 + i,
    });
  }
  return setupPrimary();
}

async function main() {
  const db = await open({
    filename: "group_chat.db",
    driver: sqlite3.Database,
  });
  console.log("SQLITE Database connected");

  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_offset TEXT,
      message TEXT NOT NULL,
      groupId TEXT,
      sender_id TEXT,
      receiver_id TEXT
    );
  `);

  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
    connectionStateRecovery: true,
    adapter: createAdapter(),
  });

  await connectToDB();
  await connectToCloudinary();

  app.use(express.static(path.join(__dirname, "public")));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/auth", authRoutes);
  app.use("/group", groupRoutes);
  app.use("/user", userRoutes);

  app.get("/check", (req, res) => {
    res.send("<h1>server is up and running</h1>");
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Invalid token"));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error("Authentication error " + err.message));
    }
  });

  io.on("connection", (socket) => {
    if (!socket.user) {
      socket.disconnect();
      return;
    }

    console.log(`User connected: ${socket.user.username}`);

    const validateAndFetch = async (type, id) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid ${type} ID`);
      }
      if (type === "group") {
        const group = await Group.findById(id);
        if (!group) {
          throw new Error("Group not found");
        }
        if (!group.members.includes(socket.user._id)) {
          throw new Error(
            `${socket.user.username} is not a member of this group`
          );
        }
        return group;
      } else if (type === "user") {
        const user = await User.findById(id);
        if (!user) {
          throw new Error("User not found");
        }
        return user;
      }
    };

    socket.selectedGroup = null;
    socket.selectedUser = null;

    socket.on("select group", async (groupId, callback) => {
      try {
        const group = await validateAndFetch("group", groupId);
        socket.selectedGroup = groupId;
        socket.selectedUser = null;
        socket.join(groupId);
        console.log(
          `Group Selected: ${group.name}, socket.selectedGroup: ${socket.selectedGroup}`
        );
        socket.emit("fetch group messages", groupId, (error, messages) => {
          if (error) {
            console.error("Error fetching group messages:", error);
          } else {
            console.log("Messages Fetched: ", messages);
            io.to(socket.id).emit("display messages", messages);
          }
        });
        callback();
      } catch (error) {
        callback(error.message);
      }
    });

    socket.on("select user", async (userId, callback) => {
      try {
        const user = await validateAndFetch("user", userId);
        socket.selectedUser = userId;
        socket.selectedGroup = null;
        socket.join(userId);
        console.log(
          `User Selected: ${user.username}, socket.selectedUser: ${socket.selectedUser}`
        );
        socket.emit("fetch user messages", userId, (error, messages) => {
          if (error) {
            console.error("Error fetching user messages:", error);
          } else {
            console.log("Messages Fetched: ", messages);
            io.to(socket.id).emit("display messages", messages);
          }
        });
        callback();
      } catch (error) {
        callback(error.message);
      }
    });

    socket.on("chat message", async (msg, clientOffset, callback) => {
      if (typeof callback !== "function") {
        callback = () => {};
      }

      console.log("Message received:", msg, clientOffset);

      try {
        if (socket.selectedGroup) {
          const result = await db.run(
            "INSERT INTO messages (message, client_offset, groupId, sender_id) VALUES (?, ?, ?, ?)",
            msg,
            clientOffset,
            socket.selectedGroup,
            socket.user.id
          );
          io.to(socket.selectedGroup).emit("chat message", msg, clientOffset);
          console.log(
            `Message saved and sent to group ${socket.selectedGroup}: ${msg}`
          );
        } else if (socket.selectedUser) {
          const result = await db.run(
            "INSERT INTO messages (message, client_offset, receiver_id, sender_id) VALUES (?, ?, ?, ?)",
            msg,
            clientOffset,
            socket.selectedUser,
            socket.user.id
          );
          io.to(socket.selectedUser).emit("chat message", msg, clientOffset);
          console.log(
            `Message saved and sent to user ${socket.selectedUser}: ${msg}`
          );
        } else {
          throw new Error("No group or user selected.");
        }
        callback();
      } catch (error) {
        console.error("Error inserting message into DB:", error.message);
        callback(error.message);
      }
    });

    socket.on("fetch group messages", async (groupId, callback) => {
      try {
        const group = await validateAndFetch("group", groupId);
        const messages = await db.all(
          "SELECT message,sender_id FROM messages WHERE groupId = ?",
          groupId
        );
        console.log("Group Messages:", messages);
        callback(
          null,
          messages.map((row) => ({
            message: row.message,
            senderId: row.sender_id,
          }))

        );
      } catch (error) {
        console.error("Error fetching group messages:", error.message);
        callback(error.message);
      }
    });

    socket.on("fetch user messages", async (userId, callback) => {
      try {
        const user = await validateAndFetch("user", userId);
        console.log("Fetching sender and receiver Id's :", userId, socket.user.id);
        const messages = await db.all(
          "SELECT message,sender_id FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
          userId,
          socket.user.id,
          socket.user.id,
          userId
        );
        console.log("User Messages:", messages); 
        callback(
          null,
          messages.map((row) => ({
            message: row.message,
            senderId: row.sender_id,
          })
          )
        );
      } catch (error) {
        console.error("Error fetching user messages:", error.message);
        callback(error.message);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

main().catch((error) => {
  console.error("Error:", error);
});
