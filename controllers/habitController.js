const Habit = require('../models/habitModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('../controllers/handlerController');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId; 

//CURD FUNCTIONS
exports.getHabits = factory.getAll(Habit)

exports.getHabit = factory.getOne(Habit)

exports.createHabit = factory.createOne(Habit)

exports.updateHabit = factory.updateOne(Habit)

exports.deleteHabit = factory.deleteOne(Habit)



// Other

const sendResponse = catchAsync(async(req, res, userID)=>{

    var activeHabits = await Habit.find({ active: true, user: userID });
    var notActiveHabits = await Habit.find({ active: false, user: userID });
    var data;
    if (activeHabits[0]) {
        data = await activeHabits[0].getTodayHabitsProcess(req, userID)
    }
    else if(notActiveHabits[0]){
        data = await notActiveHabits[0].getTodayHabitsProcess(req, userID)
    }
    else {
        return res.status(200).json({
            status: 'success',
            requestTime:req.requestTime,
            data:[]
        });
    }


    return res.status(200).json({
        status: 'success',
        requestTime:req.requestTime,
        activeCounter: data[1].length,
        notActiveCounter:data[0].length,
        data: {
            activeHabits: data[1],
            notActiveHabits:data[0]        
            }
    });
})


exports.check = catchAsync(async (req, res, next) => {
    var currentTime, currentDay;

    if (req.query.specialTime && req.query.specialTime !== undefined) {
        currentTime = req.query.specialTime;
        currentDay = req.query.specialDay;
    } else {
        currentTime = req.requestTime.split("T")[0];
        var daysOfWeek = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        var date = new Date();
        var dayIndex = date.getDay();
        var todayName = daysOfWeek[dayIndex];
        console.log(todayName);
        currentDay = todayName;
    }
    req.query.specialTime = currentTime;
    req.query.specialDay = currentDay;
    const habit = await Habit.updateOne({
        $and: [
            { _id: req.params.checkHabitID },
            { date: { $not: { $eq: currentTime } } },
            { user: req.user.id },
            ],
        },
        {
            $push: { date: currentTime }, 
            $set: { active: true },
            $inc: { counter: 1 },
        }
    );

    if (habit.modifiedCount === 0) {
        return next(new AppError("You Don't Have This Habit, or You Try To Make It Check Again, Please Create It If It Not Already Created Then Click On Completing", 404));
    }
    
    sendResponse(req, res, req.user.id);
});

exports.unCheck = catchAsync(async (req, res, next) => {

    var currentTime, currentDay;
    if (req.query.specialTime && req.query.specialTime!==undefined) {
        currentTime = req.query.specialTime
        currentDay = req.query.specialDay;
    }
    else {
        currentTime = req.requestTime.split('T')[0];    
        var daysOfWeek = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        var date = new Date();
        var dayIndex = date.getDay();
        var todayName = daysOfWeek[dayIndex];
        console.log(todayName);
        currentDay = todayName;
    }
    req.query.specialTime = currentTime;
    req.query.specialDay = currentDay;
    const habit = await Habit.updateOne({
        $and: [
            { _id: req.params.uncheckHabitID },
            { date: currentTime},
            { user: req.user.id },
        ],
        },
        {
            $inc: { counter: -1 },
            $pull: { date: currentTime },
        }
    );

    if (habit.modifiedCount === 0) {
        return next(new AppError("You Don't Have This Habit, Or This Habit Is Not Completed, Please Check It Is Already Created  and Completed Then Click On un-completing", 404));
    }

    await Habit.updateOne({
            $and: [
                { _id: req.params.uncheckHabitID },
                { date: { $eq: [] }},
                { user: req.user.id },
            ]
        },
        {
            $set: { active: false }
        }
        );
    sendResponse(req, res, req.user.id);
});

exports.getTodayHabits = catchAsync(async (req, res, next) => {
    sendResponse(req, res, req.user.id)
})

// Aggregation

exports.getDetail = catchAsync(async (req, res, next) => {
    userID = req.user.id    
    const completedDailyHabits = await Habit.aggregate([
        {   
            $match: {
                user: new ObjectId(`${req.user.id}`),
                active: true
            }
        },
        {
            $group:{
                _id:'$counter',
                // Make Array With Name Value From DB
                Name: { $push: '$name' },
                // Number Of Completed
                completed_1: { $push: { $gte: ['$counter', 1] } },
                completed_10: { $push: { $gte: ['$counter', 10] } },
                completed_30: { $push: { $gte: ['$counter', 30] } },
                completed_50: { $push: { $gte: ['$counter', 50] } },
                completed_75: { $push: { $gte: ['$counter', 75] } },
                completed_100: { $push: { $gte: ['$counter', 100] } },
                completed_200: { $push: { $gte: ['$counter', 200] } },
                completed_201: { $push: { $gt: ['$counter', 200] } },
                },
        },
    ])

    let resultCompletedDailyHabits = [];
    const filteredResults = completedDailyHabits.map(group => {
        filteredGroup = {}
        filteredGroup['name'] = group.Name[0];
        Object.keys(group).forEach(key => {
            if (key !== '_id' && key !== 'Name' && group[key][0] !== false) {
                filteredGroup[`${key}`] = parseInt(key.split("_")[1]);
            }
        });
        resultCompletedDailyHabits.push(filteredGroup);
    });


    res.status(200).json({
        status: 'success',
        requestTime: req.requestTime,
        data:{
            resultCompletedDailyHabits
        }
    });
})