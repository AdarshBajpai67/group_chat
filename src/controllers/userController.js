const express=require('express');
const User=require('../models/userModel');
const Group=require('../models/groupModel');

const router=express.Router();

exports.getAllUsers=async (req,res)=>{
    try{
        const users=await User.find();
        res.status(200).json({message:'All users',users});
    }catch(err){
        console.error('Error fetching users:',err);
        res.status(500).json({message:'Internal Server Errorr'});
    }
}


exports.getAllUsersInGroup=async (req,res)=>{
    const {groupID}=req.body;
    try{
        const group=await Group.findById(groupID);
        if(!group){
            return res.status(400).json({message:'Group does not exist'});
        }

        const userId=req.user.id;
        if(!group.members.includes(userId)){
            return res.status(400).json({message:'You are not a member of the group'});
        }
        
        const usersInGroup=await group.members;
        res.status(200).json({message:`All users in ${group.name}`,users:usersInGroup});
    }catch(err){
        // console.error('Error fetching users:',err);
        res.status(500).json({message:'Internal Server Error'});
    }
}

