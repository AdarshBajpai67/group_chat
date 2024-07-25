const express=require('express');
const authController=require('../controllers/authController');
const messageController=require('../controllers/messageController');

const router=express.Router();

router.get('/getGroupMessages',authController,messageController.getGroupMessages);

router.get('/getUserMessages',authController,messageController.getUserMessages);

module.exports=router;