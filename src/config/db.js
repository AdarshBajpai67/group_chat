require('dotenv').config()

const mongoose = require('mongoose')

const connectToDB=async()=>{
    try{
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to DB');
    }catch(err){
        console.log('Error connecting to DB',err);
    }
}

module.exports=connectToDB;