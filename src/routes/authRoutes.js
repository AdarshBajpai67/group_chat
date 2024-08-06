const express=require('express');
const authController=require('../controllers/authController');
const authMiddleware=require('../middlewares/authMiddleware');

const router=express.Router();

router.post('/registerUser',authController.registerUser);

router.post('/loginUser',authController.loginUser);

router.patch('/updateUserDetails',authMiddleware,authController.updateUserDetails);

router.delete('/deleteUser',authMiddleware,authController.deleteUser);



module.exports=router;