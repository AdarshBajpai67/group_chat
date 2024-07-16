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
  
  io.on('connection',async (socket)=>{
    if(!socket.user){
      socket.disconnect();
      return;
    }

    console.log(`user connected : ${socket.user.username}`);

    socket.on('chat message',async (msg,groupId,userId,clientOffset,callback)=>{
      console.log('Received message:', msg, 'GroupId:', groupId, 'UserId:', userId, 'ClientOffset:', clientOffset);
      if (typeof callback !== 'function') {
        callback = () => {};
      }

      let result;
        if(groupId){
          try{
            const isValidGroupId = mongoose.Types.ObjectId.isValid(groupId);
            if (!isValidGroupId) {
              return callback('Invalid groupId');
            }
            const group = await Group.findById(isValidGroupId);
            if(!group.members.includes(socket.user.id)){
              return callback(`${socket.user.username} is not a member of this ${group.name}`);
            }
            result=await db.run('INSERT INTO messages(message,client_offset,groupId) VALUES(?, ?,?)',msg,clientOffset,groupId);
            console.log('Message inserted into DB:', result);
            io.to(groupId).emit('chat message',msg, result.lastID);
            console.log('Message sent to group:', groupId);
            callback();
          }catch(err){
            console.log('Group Messaging Error: ' + err.message);
            callback('Error Sending Message');
          }
        }else if(userId){
          try{
            const user=await User.findById(userId);
            if(!user){
              return callback('User not found');
            } 
            result=await db.run('INSERT INTO messages(message,client_offset,sender_id,receiver_id) VALUES(?,?,?,?)',msg,clientOffset,socket.user.id,userId);
            console.log('Message inserted into DB:', result);
            io.to(userId).emit('chat message',msg,result.lastID);
            console.log('Message sent to user:', userId);
            callback();
        }catch(err){
          console,log('Direct Message Error:',err);
          callback('Error Sending Message');
        }
      }else{
        callback('Invalid Message: neither to user nor group');
      }
      })

      if (!socket.recovered) {
        try {
          await db.each('SELECT id, message FROM messages WHERE id > ?', [socket.handshake.auth.serverOffset], (err, row) => {
            if (err) {
              console.log(err);
            } else {
              console.log('Sending previous message:', row.message, 'with ID:', row.id);
              socket.emit('chat message', row.message, row.id);
            }
          });
        } catch (err) {
          console.log(err);
        }
      }

      socket.on('disconnect',()=>{
          console.log('user disconnected');
      })
  
  })
  
  const port=process.env.PORT;
  
  server.listen(port,()=>{
      console.log(`Server started and running on port ${port}`);
  })

}

main().catch(err=>{
  console.log(err);
})
