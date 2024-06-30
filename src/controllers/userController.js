const express=require('express');
const User=require('../models/userModel');

const router=express.Router();

exports.getAllUsers=async (req,res)=>{
    try{
        const users=await User.find();
        res.status(200).json({
            status: 'success',
            data: users
        })
    }catch(err){
        res.status(400).json({
            status: 'fail',
            message: err.message
        })
    }
}