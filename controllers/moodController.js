const Mood = require('../models/moodModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerController');
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId; 
//CURD FUNCTIONS
exports.getMoods = factory.getAll(Mood)

exports.getMood = factory.getOne(Mood)

exports.createMood = factory.createOne(Mood)

exports.updateMood = factory.updateOne(Mood)

exports.deleteMood = factory.deleteOne(Mood)


exports.getMyMoods = catchAsync(async (req, res, next) => {
    
    const moods = await Mood.find({ user: req.user.id });

    res.status(200).json({
        status: 'success',
        requestTime: req.requestTime,
        moodsCounter:moods.length,
        moods
    });
});


exports.getWeeklyMoods = catchAsync(async (req, res, next) => {
    const year = parseInt(req.query.moodDate.split("-")[0], 10);
    const month = parseInt(req.query.moodDate.split("-")[1], 10);

    // Use aggregation to find matching documents
    const moods = await Mood.aggregate([
      // Stage 1: Match documents with the same year and month
        {
            $match: {
                $expr: {
                    $and: [{user: new ObjectId(`${req.user.id}`)},
                    {
                        $eq: [
                        { $year: { $dateFromString: { dateString: "$date" } } },
                        year,
                        ],
                    },
                    {
                        $eq: [
                        { $month: { $dateFromString: { dateString: "$date" } } },
                        month,
                        ],
                    },
                    ],
                },
            },
        },
    ]);

    res.status(200).json({
        status: 'success',
        requestTime: req.requestTime,
        moodsCounter:moods.length,
        moods
    });
});