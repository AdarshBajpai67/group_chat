require('dotenv').config();

const express=require('express');

const connectToDB=require('./src/config/db');
const connectToCloudinary=require('./src/config/cloudinary');

const authRoutes=require('./src/routes/authRoutes');
const groupRoutes=require('./src/routes/groupRoutes');
const userRoutes=require('./src/routes/userRoutes');

const app=express();
app.use(express.json());

connectToDB();
connectToCloudinary();

app.use('/auth',authRoutes);
app.use('/group',groupRoutes);
app.use('/user',userRoutes);

app.get('/',(req,res)=>{
    res.send('server is up and running');
})

const PORT=process.env.PORT || 8000;

app.listen(PORT,()=>{
    console.log(`Server started on port ${PORT}`);
})