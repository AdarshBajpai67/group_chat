const Group = require('../models/groupModel');

exports.createGroup = async (req, res) => {
    const { name, description } = req.body;
    try{
        if(!name){
            return res.status(400).json({message:'Name is required'});
        }   
        // console.log("req.user._id",req.user._id);
        // console.log("req.user.id",req.user.id)
        const group=await Group.create({name,description,admin:req.user.id,members:[req.user.id]});
        await group.save();
        res.status(201).json({message:'Group created successfully',group});
    }catch(err){
        if (err.code === 11000 && err.keyPattern && err.keyValue) {
            res.status(400).json({ message:'Group already exists.'});
        } else {
            // Other error (e.g., validation error, server issue)
            // console.error('Error creating user:', err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}

exports.getAllGroups = async (req, res) => {
    try{
        const allGroups=await Group.find();
        // console.log('allGroups',allGroups);
        res.status(200).json({message:'All groups',groups:allGroups});
    }catch(err){
        console.error('Error fetching groups:',err);
        res.status(500).json({message:'Internal Server Error'});
    }

}

exports.joinGroup = async (req, res) => {
    const {groupID}=req.body;
    // console.log('groupID',groupID);
    try{
        const group=await Group.findById(groupID);
        if(!group){
            return res.status(400).json({message:'Group does not exist'});
        }
        // console.log('user id',req.user);
        if(group.members.includes(req.user.id)){
            return res.status(400).json({message:'You are already a member of the group'});
        }

        group.members.push(req.user.id);
        await group.save();
        res.status(200).json({message:'Joined group successfully',group});
    }catch(err){

        if(err.code === 11000 && err.keyPattern && err.keyValue) {
            res.status(400).json({ message:'Group already joined.'});
        } else {
            // Other error (e.g., validation error, server issue)
            console.error('Error joining group:', err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}

exports.leaveGroup = async (req, res) => {
    const {groupID}=req.body;
    try{
        const group = await Group.findById(groupID);
        // console.log('group',group);
        // console.log('req.user._id',req.user.id);
        if(!group){
            return res.status(400).json({message:'Group does not exist'});
        }

        if(!group.members.includes(req.user.id)){
            return res.status(400).json({message:'You are not a member of the group'});
        }

        group.members.pull(req.user.id);
        await group.save();
        res.status(200).json({message:'Left group successfully',group});
    }catch(err){
        console.error('Error leaving group:',err);
        res.status(500).json({message:'Internal Server Error'});
    }
}

exports.updateGroupDescription = async (req, res) => {
    const {groupID, description} = req.body;
    try{
        if(!groupID){
            return res.status(400).json({message:'Group does not exist'});
        }

        if(group.admin!==req.user._id){
            return res.status(401).json({message:'You are not authorized to update the group'});
        }

        group.description=description;
        await group.save();
        res.status(200).json({message:'Group description updated successfully',group});
    }catch(err){
        console.error('Error updating group description:',err);
        res.status(500).json({message:'Internal Server Error'});
    }
}