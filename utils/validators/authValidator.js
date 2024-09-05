const { check, body } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const User = require("../../models/userModel");

exports.signupValidator = [
  check("name")
    .notEmpty()
    .withMessage("User Name Is Required")
    .isLength({ min: 3 })
    .withMessage("Too short User name"),
  check("bio").optional(),
  check("email")
    .notEmpty()
    .withMessage("Email required")
    .isEmail()
    .withMessage("Invalid email address")
    .custom((val) =>
      User.findOne({ email: val }).then((user) => {
        if (user && user.emailVerified) {
          return Promise.reject(new Error("E-mail already in use"));
        } else if (user && !user.emailVerified) {
          // Return the delete operation so that the promise chain remains intact
          return User.findByIdAndDelete(user.id).then(() => {
            // Continue the promise chain after deletion if needed
            return Promise.resolve();
          });
        }
      })
    ),

  check("password")
    .notEmpty()
    .withMessage("Password required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  validatorMiddleware,
];

exports.loginValidator = [
  check("email")
    .notEmpty()
    .withMessage("Email required")
    .isEmail()
    .withMessage("Invalid email address"),

  check("password")
    .notEmpty()
    .withMessage("Password required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),

  validatorMiddleware,
];

exports.changeUserPasswordValidator = [
  body("currentPassword")
    .notEmpty()
    .withMessage("You must enter your current password"),
  body("newPassword")
    .notEmpty()
    .withMessage("You must enter new password"),
  validatorMiddleware,
];


exports.updateLoggedUserValidator = [
  body("name").optional(),
  body("photo").optional(),
  body("bio").optional(),
  validatorMiddleware,
];

exports.resetPasswordValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email required")
    .isEmail()
    .withMessage("Invalid email address"),
  body("newPassword").notEmpty().withMessage("You must enter new password"),
  validatorMiddleware,
];

exports.verifyPassResetCodeValidator = [
  check("resetCode").notEmpty().withMessage("Reset Code Is Required"),
  validatorMiddleware,
];

exports.verifyEmailCodeValidator = [
  check("verifiedCode").notEmpty().withMessage("Verified Code Is Required"),
  validatorMiddleware,
];

