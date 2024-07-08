require('dotenv').config();

const express=require('express');
const {createServer}=require('http');
const path=require('path');
const {Server}=require('socket.io');
const sqlite3=require('sqlite3');
const {open}=require('sqlite');

const connectToDB=require('./src/config/db');
const connectToCloudinary=require('./src/config/cloudinary');

const authRoutes=require('./src/routes/authRoutes');
const groupRoutes=require('./src/routes/groupRoutes');
const userRoutes=require('./src/routes/userRoutes');
const { access } = require('fs');

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
      message TEXT NOT NULL
    );
  `); 

  const app=express();
  const server=createServer(app);
  const io=new Server(server,{
      cors:{
          origin:'*',
      },
      connectionStateRecovery:true
  });
  
  app.use(express.json());
  
  connectToDB();
  connectToCloudinary();
  
  app.use('/auth',authRoutes);
  app.use('/group',groupRoutes);
  app.use('/user',userRoutes);
  
  app.get('/check',(req,res)=>{
      res.send('<h1>server is up and running</h1>');
  })
  
  app.get('/',(req,res)=>{
      res.sendFile(path.join(__dirname,'index.html'))
  })
  
  io.on('connection',async (socket)=>{
      console.log(`a user connected by id: ${socket.id}`);
      socket.on('chat message',async (msg,clientOffset,callback)=>{
        let result;
        try{
          result=await db.run('INSERT INTO messages(message,client_offset) VALUES(?, ?)',msg,clientOffset);
        }catch(err){
          console.log(err);
          if(err.errno===19){
            callback('Duplicate message');
          }else{}
          return;
        }
        console.log('message: '+msg);
        io.emit('chat message',msg,result.lastID);
        callback();
      })

      if(!socket.recovered){
        try{
          await db.each('SELECT id,message FROM messages WHERE id>?',[socket.handshake.auth.serverOffset],(_err,row)=>{
            socket.emit('chat message',row.message,row.id);
          });
        }catch(err){
          console.log(err);
        }
      }

      socket.on('disconnect',()=>{
          console.log('user disconnected');
      })
  
  })
  
  const PORT=process.env.PORT || 8000;
  
  server.listen(PORT,()=>{
      console.log(`Server started and running on port ${PORT}`);
  })

}

main().catch(err=>{
  console.log(err);
})
