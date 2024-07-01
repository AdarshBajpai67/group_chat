const express = require('express');

const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/getAllUsers', userController.getAllUsers);

router.get('/getAllUsersInGroup',authMiddleware,userController.getAllUsersInGroup);

module.exports = router;