const crypto = require("crypto");
const jwt = require("jsonwebtoken"); // For Create Token
const { promisify } = require("util"); // For Make Functions Async
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const sendEmail = require("../utils/sendEmail");

// Crate Token...
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET); //,{expiresIn: process.env.JWT_EXPIRES_IN}
};

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    status: "success",
    token: `Bearer ${token}`,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // Get User Info From Client Side...
  await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
  });
  next()
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //  Check If Email And Password Exist
  if (!email || !password) {
    return next(new AppError("Please Provide Email and Password", 400));
  }

  /* Check If User Exist And Password Is Correct,
        Note: we use .select('+password') to can acces to password of curent user and 
        check if it correct or not*/
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect Email or Password", 401));
  }
  sendToken(user, 201, res);
});

exports.protect_ = catchAsync(async (req, res, next) => {
  // Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.body.token && req.body.token.startsWith("Bearer")) {
    token = req.body.token.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError(" You are not logged in, please log in to get access.", 401)
    );
  }

  // verification token
  const decodedToken = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET
  );
  // decodedToken={id, iat,and one more}

  // Check if  user still exists
  const curentUser = await User.findById(decodedToken.id);
  if (!curentUser) {
    return next(
      new AppError("The user belonging to this token does not longer exist")
    );
  }

  // Check if the user changed password after the token was issued
  if (curentUser.changedPasswordAfter(decodedToken.iat)) {
    return next(
      new AppError(
        "The user recently changed password!,please log in again.",
        401
      )
    );
  }
  req.user = curentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

exports.updateMyPassword = catchAsync(async (req, res, next) => {
    //1) get user that is logined into
    const user = await User.findById(req.user.id).select("+password");

    //2) check if current password is correct
    if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
        return next(new AppError("current password is incorrect..!!", 401));
    }

    //3) update password
    user.password = req.body.newPassword;
    user.passwordChangeAt = Date.now();
    await user.save();
    //4) login user,send WWJ
    sendToken(user, 200, res);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1) Get user by email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(
        new AppError(`There is no user with that email ${req.body.email}`, 404)
        );
    }
    // 2) If user exist, Generate hash reset random 6 digits and save it in db

    const resetCode = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedResetCode = crypto
        .createHash("sha256")
        .update(resetCode)
        .digest("hex");

        
        // Save hashed password reset code into db
        // Add expiration time for password reset code (10 min)
        await User.findByIdAndUpdate(
            user._id,
            {
            passwordResetCode: hashedResetCode,
            passwordResetExpires: Date.now() + 2 * 60 * 1000,
            passwordResetVerified: false
            },
            { new: true }
        );
        

    // 3) Send the reset code via email
    const message = `Hi ${user.name},\n We received a request to reset the password on your Habit-App Account. \n ${resetCode} \n Enter this code to complete the reset. \n Thanks for helping us keep your account secure.\n The Habit-App Team, developer: Mohammed Arsalan, ✨️.`;
    try {
        await sendEmail({
        email: user.email,
        subject: "Your password reset code (valid for 2 min)",
        message,
        });
    } catch (err) {
        await User.findByIdAndUpdate(
            user._id,
            {
            passwordResetCode: undefined,
            passwordResetExpires: undefined,
            passwordResetVerified: undefined
            },
            { new: true }
        );
        return next(new AppError("There is an error in sending email", 500));
    }

    res.status(200).json({ status: "success", message: "Reset code sent to email" });
});

// @desc    Verify password reset code
// @route   POST /api/v1/auth/verifyResetCode
// @access  Public
exports.verifyPassResetCode = catchAsync(async (req, res, next) => {

  // 1) Get user based on reset code
  let resetCode = req.body.resetCode
  console.log(typeof resetCode);
  if (typeof (resetCode) !== "string") {
    resetCode = resetCode.toString()
  }
  console.log(typeof resetCode);
    const hashedResetCode = crypto
        .createHash("sha256")
        .update(resetCode)
        .digest("hex");

    const user = await User.findOne({
      passwordResetCode: hashedResetCode,
    });
    if (!user) {
      return next(
        new AppError("verified code invalid, please enter valid code", 404)
      );
    }
  
    const isExpired = await User.findOne({
        passwordResetCode: hashedResetCode,
        passwordResetExpires: { $gt: Date.now() },
    });
    if (!isExpired) {
      return next(new AppError("Reset code expired, please try again", 410));
    }

    // 2) Reset code valid
    await User.findByIdAndUpdate(
        user._id,
        {
        passwordResetVerified: true,
        },
        { new: true }
        );

    res.status(200).json({
        status: "success",
    });
});

// @desc    Reset password
// @route   POST /api/v1/auth/resetPassword
// @access  Public
exports.resetPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(
        new AppError(`There is no user with email ${req.body.email}`, 404)
        );
    }

    // 2) Check if reset code verified
    if (!user.passwordResetVerified) {
        return next(new AppError("Reset code not verified", 400));
    }

    await User.findByIdAndUpdate(
        user._id,
        {
        password: req.body.newPassword,
        passwordResetCode: '',
        passwordResetExpires: undefined,
        passwordResetVerified: false
        },
        { new: true }
    );

    // 3) if everything is ok, generate token
    sendToken(user._id, 201, res);
});

exports.logout = catchAsync(async (req, res, next) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.redirect("/");
});

// verify email
exports.verifyEmail = catchAsync(async (req, res, next) => {

  const user = await User.findOne({ email: req.body.email });
  // 1) Generate hash reset random 6 digits and save it in db

  const verifiedCode = Math.floor(1000 + Math.random() * 9000).toString();
  const hashedVerifiedCode = crypto
    .createHash("sha256")
    .update(verifiedCode)
    .digest("hex");

  // Save hashed password reset code into db
  // Add expiration time for password reset code (10 min)
  await User.findByIdAndUpdate(
    user._id,
    {
      emailVerifiedCode: hashedVerifiedCode,
      emailVerifiedExpires: Date.now() + 2 * 60 * 1000,
      emailVerified: false,
    },
    { new: true }
  );

  // 3) Send the reset code via email
  const message = `Hi ${user.name},\n We received a request to verified email on your Habit-App Account. \n ${verifiedCode} \n Enter this code to complete the verification. \n Thanks for helping us keep your account secure.\n The Habit-App Team,developer: Mohammed Arsalan, ✨️.`;
  try {
    await sendEmail({
      email: user.email,
      subject: "Your verified email code (valid for 2 min)",
      message,
    });
  } catch (err) {
    await User.findByIdAndDelete(user._id);
    return next(new AppError("There is an error in sending email", 500));
  }

  res
    .status(200)
    .json({ status: "success", message: "verified email code sent to email" });
});


exports.verifyEmailCode = catchAsync(async (req, res, next) => {
  // 1) Get user based on reset code
    let verifiedCode = req.body.verifiedCode;
    console.log(typeof verifiedCode);
    if (typeof verifiedCode !== "string") {
      verifiedCode = verifiedCode.toString();
    }
    console.log(typeof verifiedCode);
  const hashedResetCode = crypto
    .createHash("sha256")
    .update(verifiedCode)
    .digest("hex");

  const user = await User.findOne({
    emailVerifiedCode: hashedResetCode});
  if (!user) {
    return next(new AppError("verified code invalid, please enter valid code", 404));
  }

  const isExpired = await User.findOne({
      emailVerifiedCode: hashedResetCode,
      emailVerifiedExpires: { $gt: Date.now() },
    });

  if (!isExpired) {
    await User.findByIdAndDelete(user._id);
    return next(new AppError("verified code expired, please try again", 500));
  }
  // 2) Reset code valid
  await User.findByIdAndUpdate(
    user._id,
    {
      emailVerifiedCode: "",
      emailVerifiedExpires: undefined,
      emailVerified: true
    },
    { new: true }
  );

  sendToken(user, 201, res);
});