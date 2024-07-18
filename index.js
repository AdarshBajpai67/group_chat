require('dotenv').config();

const express=require('express');
const jwt=require('jsonwebtoken');
const {createServer}=require('http');
const path=require('path');
const {Server}=require('socket.io');
const sqlite3=require('sqlite3');
const {open}=require('sqlite');
const {availableParallelism}=require('node:os');
const cluster=require('node:cluster');
const {createAdapter,setupPrimary} = require('@socket.io/cluster-adapter');
const mongoose=require('mongoose');

const JWT_SECRET=process.env.JWT_SECRET;

const connectToDB=require('./src/config/mongoDB');
const connectToCloudinary=require('./src/config/cloudinary');

const authRoutes=require('./src/routes/authRoutes');
const groupRoutes=require('./src/routes/groupRoutes');
const userRoutes=require('./src/routes/userRoutes');
const User = require('./src/models/userModel');
const Group=require('./src/models/groupModel');

if(cluster.isPrimary){
  const numProcesses=availableParallelism();
  for(let i=0; i<numProcesses; i++){
    cluster.fork({
      PORT:3000+i
    });
  }
  return setupPrimary();
}

async function main(){
  const db=await open({
    filename: 'group_chat.db',
    driver: sqlite3.Database
  });
  console.log('SQLITE Database connected');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_offset TEXT UNIQUE,
      message TEXT NOT NULL,
      groupId TEXT,
      sender_id TEXT,
      receiver_id TEXT
    );
  `); 

  const app=express();
  const server=createServer(app);
  const io=new Server(server,{
      cors:{
          origin:'*',
      },
      connectionStateRecovery:true,
      adapter:createAdapter()
  });
  
  await connectToDB();
  await connectToCloudinary();

  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  app.use('/auth',authRoutes);
  app.use('/group',groupRoutes);
  app.use('/user',userRoutes);
  
  app.get('/check',(req,res)=>{
      res.send('<h1>server is up and running</h1>');
  })
  
  // app.get('/', (req, res) => {
  //   res.sendFile(path.join(__dirname, 'index.html'));
  // });

  // app.get('/chat', (req, res) => {
  //   res.sendFile(path.join(__dirname, 'chat.html'));
  // });

  io.use((socket,next)=>{
    const token=socket.handshake.auth.token;
    if(!token){
      return next(new Error('Invalid token'));
    }
    try{
      const decoded = jwt.verify(token,JWT_SECRET);
      console.log('token', token);
      console.log('decoded', decoded);
      socket.user=decoded;
      next();
    }catch(err){
      return next(new Error('Authentication error '+err.message));
    }
  })
  
  io.on('connection', async (socket) => {
    if (!socket.user) {
      socket.disconnect();
      return;
    }
  
    console.log(`User connected: ${socket.user.username}`);

    const validateAndFetch = async (type, id) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log(`Invalid ${type} ID received:`, id);
        throw new Error(`Invalid ${type} ID`);
      }
      if (type === 'group') {
        const group = await Group.findById(id);
        if (!group) {
          console.log(`Group not found for ID:`, id);
          throw new Error('Group not found');
        }
        if (!group.members.includes(socket.user._id)) {
          console.log(`${socket.user.username} is not a member of group ${group.name}`);
          throw new Error(`${socket.user.username} is not a member of this group`);
        }
        return group;
      } else if (type === 'user') {
        const user = await User.findById(id);
        if (!user) {
          console.log(`User not found for ID:`, id);
          throw new Error('User not found');
        }
        return user;
      }
    };

    socket.selectedGroup=null;
    socket.selectedUser=null;

    socket.on('select group', async (groupId, callback) => {
      try {
        const group = await validateAndFetch('group', groupId);
        socket.selectedGroup = groupId;
        socket.selectedUser = null;
        socket.join(groupId);
        console.log(`Group Selected: ${group.name}, socket.selectedGroup: ${socket.selectedGroup}`);
        callback();
      } catch (error) {
        callback(error.message);
      }
    });

    socket.on('select user', async (userId, callback) => {
      try {
        const user = await validateAndFetch('user', userId);
        socket.selectedUser = userId;
        socket.selectedGroup = null;
        socket.join(userId);
        console.log(`User Selected: ${user.username}, socket.selectedUser: ${socket.selectedUser}`);
        callback();
      } catch (error) {
        callback(error.message);
      }
    });
  
    socket.on('chat message', async (msg, clientOffset, callback) => {
      console.log('Received message:', msg, 'ClientOffset:', clientOffset);
      if (typeof callback !== 'function') {
        callback = () => {};
      }
  
      if (socket.selectedGroup) {
        try {
          const result = await db.run(
            'INSERT INTO messages (message, client_offset, groupId, sender_id) VALUES (?, ?, ?, ?)',
            msg, clientOffset, socket.selectedGroup, socket.user._id
          );
          console.log('Message inserted into DB:', result);
          io.to(socket.selectedGroup).emit('chat message', msg, result.lastID);
          console.log('Message sent to group:', socket.selectedGroup);
          callback();
        } catch (err) {
          console.log('Group Messaging Error:', err.message);
          callback('Error sending message');
        }
      } else if (socket.selectedUser) {
        try {
          const result = await db.run(
            'INSERT INTO messages (message, client_offset, sender_id, receiver_id) VALUES (?, ?, ?, ?)',
            msg, clientOffset, socket.user._id, socket.selectedUser
          );
          console.log(`Message inserted into DB: Message ID = ${result.lastID}, Changes = ${result.changes}`);
          io.to(socket.selectedUser).emit('chat message', msg, result.lastID);
          console.log('Message sent to user:', socket.selectedUser);
          callback();
        } catch (err) {
          console.log('Direct Message Error:', err.message);
          callback('Error sending message');
        }
      } else {
        console.log('Invalid message: neither group nor user selected');
        callback('Invalid message: neither group nor user selected');
      }
    });
  
    if (!socket.recovered) {
      try {
        await db.each('SELECT id, message FROM messages WHERE id > ?', [socket.handshake.auth.serverOffset], (err, row) => {
          if (err) {
            console.log('Error fetching previous messages:', err.message);
          } else {
            console.log('Sending previous message:', row.message, 'with ID:', row.id);
            socket.emit('chat message', row.message, row.id);
          }
        });
      } catch (err) {
        console.log('Error in message recovery:', err.message);
      }
    }
  
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  
  })
  
  const port=process.env.PORT;
  
  server.listen(port,()=>{
      console.log(`Server started and running on port ${port}`);
  })

}

main().catch(err=>{
  console.log(err);
})
