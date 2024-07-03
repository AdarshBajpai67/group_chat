require('dotenv').config();

const User=require('../models/userModel');
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');

const JWT_SECRET_KEY=process.env.JWT_SECRET

exports.registerUser=async(req,res)=>{
    const {username,password,userDigitalProfilePhoto}=req.body;
    try{
        if(!username||!password){
            res.status(400).json({message: 'Username and Passsword are required'});
        }
        let userProfilePhoto = userDigitalProfilePhoto;

        if (!userProfilePhoto) {
            userProfilePhoto = '';
        }
        const hashedPassword=await bcrypt.hash(password,10);
        const user=await User.create({username,password:hashedPassword,userDigitalProfilePhoto:userProfilePhoto});
        if(!userDigitalProfilePhoto){
            user.userDigitalProfilePhoto=user.avatar;
        }
        await user.save();
        // console.log('user created successfully',user);
        res.status(201).json({message: 'User created successfully',user});
    }catch(err){
        if (err.code === 11000 && err.keyPattern && err.keyValue) {
            res.status(400).json({ message:'User with same credentials already exists.'});
        } else {
            // Other error (e.g., validation error, server issue)
            console.error('Error creating user:', err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}

exports.loginUser=async(req,res)=>{
    const {username,password}=req.body;
    try{
        const user=await User.findOne({username:username});
        if(!user||await bcrypt.compare(password,user.password)){
            res.status(401).json({message: 'Invalid Credentials'});
        }
        const token=jwt.sign({id:user._id,username:username},JWT_SECRET_KEY,{expiresIn:'24h'});  //for testing purpose it is set to 24hr, change to required time when deployed
        // console.log('User logged in successfully',token);
        res.status(200).json({message: 'User logged in successfully',token});
    }catch(err){
        // console.log('Error logging in user:',err);
        res.status(500).json({message: 'Internal Server Error'});
    }
};