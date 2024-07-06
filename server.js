require('dotenv').config();

const { createServer } = require('http');
const { join } = require('path');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { serialize } = require('v8');

const server=createServer();
const io=new Server(server,{
    cors:{
        origin:'*',
    },
    connectionStateRecovery:true,
});

io.on('connection',(socket)=>{
    console.log('a user connected');
})

const PORT=process.env.WS_PORT || 443;
server.listen(PORT,()=>{
    console.log(`Server started on port ${PORT}`);
})

// async function main() {
//     const db = await open({
//         filename: 'group_chat.db',
//         driver: sqlite3.Database
//     });

//     await db.exec(`
//         CREATE TABLE IF NOT EXISTS messages (
//             id INTEGER PRIMARY KEY AUTOINCREMENT,
//             group_id TEXT,
//             user_id TEXT,
//             username TEXT,
//             content TEXT,
//             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//         );
//     `);

//     const server = createServer();
//     const io = new Server(server, {
//         cors: {
//             origin: '*',
//         },
//         connectionStateRecovery: true,
//     });

//     io.on('connection', (socket) => {
//         console.log('A user connected:', socket.id);

//         socket.on('joinGroup', (groupId) => {
//             socket.join(groupId);
//             console.log(`User ${socket.id} joined group ${groupId}`);
//         });

//         socket.on('leaveGroup', (groupId) => {
//             socket.leave(groupId);
//             console.log(`User ${socket.id} left group ${groupId}`);
//         });

//         socket.on('sendMessage', async ({ groupId, userId, username, content }) => {
//             const stmt = await db.run(
//                 'INSERT INTO messages (group_id, user_id, username, content) VALUES (?, ?, ?, ?)',
//                 groupId, userId, username, content
//             );
//             const message = {
//                 id: stmt.lastID,
//                 group_id: groupId,
//                 user_id: userId,
//                 username: username,
//                 content: content,
//                 created_at: new Date().toISOString()
//             };
//             io.to(groupId).emit('newMessage', message);
//         });

//         socket.on('disconnect', () => {
//             console.log('User disconnected:', socket.id);
//         });
//     });

//     const PORT = process.env.WS_PORT || 3001;
//     server.listen(PORT, () => {
//         console.log(`WebSocket server started on port ${PORT}`);
//     });
// }

// main();
