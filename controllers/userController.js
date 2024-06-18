const { v4: uuidv4 } = require("uuid"); //for random image name id
const sharp = require("sharp");

const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const factory = require("../controllers/handlerController");

// for image
const { uploadSingleImage } = require("../utils/uploadImageMiddleware");

// use buffer from Memory Storage
exports.resizeImage = catchAsync(async (req, res, next) => {
    if (!req.file) {
        return next();
    }
    const filename = `user-${uuidv4()}-${Date.now()}.jpeg`;
    await sharp(req.file.buffer)
        .resize(600, 600)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`uploads/images/user/${filename}`);
    // save image in db
    req.body.photo = filename;
    next();
});

// Execute multer middleware
exports.uploadUserImage = uploadSingleImage("photo");

//CURD FUNCTIONS
exports.getUsers = factory.getAll(User);

//exports.getUser = factory.getOne(User,{path: 'Habits Moods Focus'})
exports.getUser = factory.getOne(User);

exports.createUser = factory.createOne(User);

exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);

exports.getME = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateLoggedUserData = catchAsync(async (req, res, next) => {
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
        name: req.body.name,
        photo: req.body.photo,
        bio: req.body.bio
        },
        { new: true }
    );

    res.status(200).json({ data: updatedUser });
});

exports.getUsersDegree = catchAsync(async (req, res) => {

    const users = await User.find().sort({ totalDegree: -1 }).select(' bio name photo totalDegree level');
    
    return res.status(200).json({
        status: "success",
        requestTime: req.requestTime,
        usersCounter: users.length,
            users
    });
})