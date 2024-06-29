require('dotenv').config();

const express=require('express');


const connectToDB=require('./src/config/db');
const connectToCloudinary=require('./src/config/cloudinary');

const app=express();


connectToDB();
connectToCloudinary();


app.get('/',(req,res)=>{
    res.send('server is up and running');
})

const PORT=process.env.PORT || 3000;

app.listen(PORT,()=>{
    console.log(`Server started on port ${PORT}`);
})