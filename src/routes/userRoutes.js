const express = require('express');

const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const { route } = require('./authRoutes');

const router = express.Router();

router.get('/getAllUsers', userController.getAllUsers);

router.get('/getAllUsersInGroup',authMiddleware,userController.getAllUsersInGroup);

router.get('/getUserGroups',authMiddleware,userController.getUserGroups);

module.exports = router;