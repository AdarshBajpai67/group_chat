// const sqlite3 = require("sqlite3");
// const { open } = require("sqlite");

// const connectAndGetDB = async () => {
//   return open({
//     filename: "group_chat.db",
//     driver: sqlite3.Database,
//   });
// };

// exports.getGroupMessages = async (req, res) => {
//     const { groupId } = req.body;
//     const db = await connectAndGetDB();
//     try{
//         const messages = await db.all('SELECT * FROM messages WHERE groupId = ?', groupId);
//         res.status(200).json(messages);
//     }catch(err){
//         console.error('Error fetching group messages:', err);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// };

// exports.getUserMessages = async (req, res) => {
//     const { userId } = req.params;
//     const {receiverId} = req.query;
//     const db = await connectAndGetDB();
//     try{
//       const messages = await db.all(
//         "SELECT message,sender_id FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
//         userId,
//         receiverId,
//         receiverId,
//         userId
//       );
//       console.log("Fetching user messages between senderId:", userId," and receiverId:", receiverId," and messages are :", messages);
//         res.status(200).json(messages);
//     }catch(err){
//         console.error('Error fetching user messages:', err);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// };