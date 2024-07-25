const sqlite3=require('sqlite3');
const { open } = require('sqlite');

const connectAndGetDB = async () => {
    return open({
        filename: 'group_chat.db',
        driver: sqlite3.Database,
    });
};

exports.getGroupMessages = async (req, res) => {
    const { groupId } = req.body;
    const db = await connectAndGetDB();
    try{
        const messages = await db.all('SELECT * FROM messages WHERE groupId = ?', groupId);
        res.status(200).json({ messages });
    }catch(err){
        console.error('Error fetching group messages:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getUserMessages = async (req, res) => {
    const { userId } = req.params;
    const db = await connectAndGetDB();
    try{
        const messages = await db.all('SELECT * FROM messages WHERE sender_id = ? OR receiver_id = ?', req.user.id, userId);
        res.status(200).json({ messages });
    }catch(err){
        console.error('Error fetching user messages:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
