const express = require('express');
userController = require('../controllers/userController')
authController = require('../controllers/authController')
const {
  signupValidator,
  loginValidator,
  changeUserPasswordValidator,
  updateLoggedUserValidator,
  verifyPassResetCodeValidator,
  verifyEmailCodeValidator,
  resetPasswordValidator,
} = require("../utils/validators/authValidator");

const router = express.Router();

// AuthRouter

router.post(
  "/signup",
  signupValidator, authController.signup,
  authController.verifyEmail
);
router.post("/verifyEmailCode", verifyEmailCodeValidator, authController.verifyEmailCode);
router.post("/login", loginValidator, authController.login);
router.post("/forgotPassword", authController.forgotPassword);
router.post("/verifyResetCode", verifyPassResetCodeValidator, authController.verifyPassResetCode);
router.patch("/resetPassword", resetPasswordValidator, authController.resetPassword);

//User Routers 
router.use(authController.protect_)

router.get('/myInformation', userController.getME, userController.getUser)
router.route("/getUsersDegree").get(userController.getUsersDegree);
router.post('/updateMyPassword', changeUserPasswordValidator, authController.updateMyPassword)
router.patch("/updateMyInformation",updateLoggedUserValidator,userController.uploadUserImage,
  userController.resizeImage,
  userController.updateLoggedUserData
);
router.patch('/updateUserBio', userController.updateUserBio)
router.use(authController.restrictTo('admin'))
router.route('').get(userController.getUsers).post(userController.uploadUserImage, userController.resizeImage, userController.createUser);
router.route('/:id').get(userController.getUser).patch(userController.uploadUserImage, userController.resizeImage,userController.updateUser)
.delete(userController.deleteUser);

module.exports = router;