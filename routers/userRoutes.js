const express = require('express');
userController = require('../controllers/userController')
authController = require('../controllers/authController')

const router = express.Router();

// AuthRouter

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post("/forgotPassword", authController.forgotPassword);
router.post("/verifyResetCode", authController.verifyPassResetCode);
router.patch("/resetPassword", authController.resetPassword);

//User Routers 
router.use(authController.protect_)

router.get('/myInformation', userController.getME, userController.getUser)
router.route("/getUsersDegree").get(userController.getUsersDegree);
router.post('/updateMyPassword', authController.updateMyPassword)
router.patch('/updateMyInformation', userController.uploadUserImage, userController.resizeImage, userController.updateLoggedUserData)
router.patch('/updateUserBio', userController.updateUserBio)
router.use(authController.restrictTo('admin'))
router.route('').get(userController.getUsers).post(userController.uploadUserImage, userController.resizeImage, userController.createUser);
router.route('/:id').get(userController.getUser).patch(userController.uploadUserImage, userController.resizeImage,userController.updateUser)
.delete(userController.deleteUser);

module.exports = router;