const express=require('express');
const groupController=require('../controllers/groupController');
const authMiddleware=require('../middlewares/authMiddleware');

const router=express.Router();

router.post('/createGroup',authMiddleware,groupController.createGroup);
router.get('/getAllGroups',groupController.getAllGroups);
router.post('/joinGroup',authMiddleware,groupController.joinGroup);
router.post('/leaveGroup',authMiddleware,groupController.leaveGroup);
router.patch('/updateGroupDescription',authMiddleware,groupController.updateGroupDescription);

module.exports=router;