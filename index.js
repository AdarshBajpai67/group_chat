require('dotenv').config();

const express=require('express');
const {createServer}=require('http');
const path=require('path');
const {Server}=require('socket.io');

const connectToDB=require('./src/config/db');
const connectToCloudinary=require('./src/config/cloudinary');

const authRoutes=require('./src/routes/authRoutes');
const groupRoutes=require('./src/routes/groupRoutes');
const userRoutes=require('./src/routes/userRoutes');

const app=express();
const server=createServer(app);
const io=new Server(server);

app.use(express.json());

connectToDB();
connectToCloudinary();

app.use('/auth',authRoutes);
app.use('/group',groupRoutes);
app.use('/user',userRoutes);

// app.get('/',(req,res)=>{
//     res.send('<h1>server is up and running</h1>');
// })

app.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname,'test.html'))
})

io.on('connection',(socket)=>{
    console.log(`a user connected by id: ${socket.id}`);
    socket.on('chat message',(msg)=>{
        console.log('message: '+msg);
        io.emit('chat message',msg);
    })
    // socket.on('disconnect',()=>{
    //     console.log('user disconnected');
    // })

})

const PORT=process.env.PORT || 8000;

// app.listen(PORT,()=>{
//     console.log(`Server started on port ${PORT}`);
// })

server.listen(PORT,()=>{
    console.log(`Server started on port ${PORT}`);
})