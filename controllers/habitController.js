const Habit = require('../models/habitModel');
const User = require('../models/userModel')
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
exports.setSpecialDayAndTime = catchAsync(async(req, res, next)=>{
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
    next()
})

exports.check = catchAsync(async (req, res, next) => {
    console.log("from check", req.query.specialTime, req.query.specialDay )
    const habit = await Habit.updateOne({
        $and: [
            { _id: req.params.checkHabitID },
            { date: { $not: { $eq: req.query.specialTime } } },
            { user: req.user.id },
            ],
        },
        {
            $push: { date: req.query.specialTime }, 
            $set: { active: true },
            $inc: { counter: 1 },
        }
    );

    if (habit.modifiedCount === 0) {
        return next(new AppError("You Don't Have This Habit, or You Try To Make It Check Again, Please Create It If It Not Already Created Then Click On Completing", 404));
    }
    next()
});

exports.unCheck = catchAsync(async (req, res, next) => {

    console.log("from uncheck", req.query.specialTime, req.query.specialDay);
    const habit = await Habit.updateOne({
        $and: [
            { _id: req.params.uncheckHabitID },
            { date: req.query.specialTime},
            { user: req.user.id },
        ],
        },
        {
            $inc: { counter: -1 },
            $pull: { date: req.query.specialTime },
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
        });
    
    next()
});

exports.getTodayHabits = catchAsync(async (req, res, next) => {

    // update user degree if it open app in new day
    const user = await User.findById(req.user.id);
    let newDegree = user.degree + 3;

    if(new Date().toISOString().split('T')[0] > user.todayOpen.toISOString().split('T')[0]) {
        await User.findByIdAndUpdate(req.user.id, { degree: newDegree, todayOpen: new Date()});
    }
    
    
    console.log('start return getTodayHabitsProcess')
    result = []
    console.log("from return  model", req.query.specialTime, req.query.specialDay);

    console.log(req.user.id);
    console.log(req.query.specialTime);
    console.log( req.query.specialDay);
    var activeHabits = await Habit.find({ $and: [{ date:req.query.specialTime}, { user: req.user.id },{ appearDays:  req.query.specialDay }]});
    var notActiveHabits = await Habit.find({
        $and: [{ date: { $not: { $eq: req.query.specialTime } } }, { appearDays:  req.query.specialDay }, { user: req.user.id }, {
        $expr: {
            $lte: [
                { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                req.query.specialTime
            ]
        }
    }]});



    if (activeHabits.length == 0 && notActiveHabits.length == 0) {
        fakeData = [
        {
            _id: "00000000000",
            name: "fake",
            description: "fake",
            icon: "fake",
            counter: 0,
            active: false,
            date: [],
            appearDays: [],
            createdAt: "0000-00-00T08:31:41.135Z",
            user: "00000000000",
        },];
        return res.status(200).json({
            status: "success",
            requestTime: req.requestTime,
            activeCounter: 0,
            notActiveCounter: 0,
            data: {
                activeHabits: fakeData,
                notActiveHabits: fakeData
            },
        });
    }
    else {

    return res.status(200).json({
        status: "success",
        requestTime: req.requestTime,
        activeCounter: activeHabits.length,
        notActiveCounter: notActiveHabits.length,
        data: {
            activeHabits,
            notActiveHabits
        },
    });
    }
})

// Aggregation

exports.userAchievements = catchAsync(async (req, res, next) => {
    // Complete Habit
    let userID = req.user.id, userDegree = 0, achievements = [], userLevel = 0; 
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
        for (i = 0; i < group.Name.length; i++) { 
            let filteredGroup = {}
            filteredGroup['name'] = group.Name[i];
            Object.keys(group).forEach(key => {
                if (key !== '_id' && key !== 'Name' && group[key][i] !== false) {
                    filteredGroup[`${key}`] = parseInt(key.split("_")[1]);
                }
            });
            resultCompletedDailyHabits.push(filteredGroup);
        }
    });
    
    // Calculate Degree Achievement 
    let completedDailyHabitsTemp = [], completedDailyHabitsAchievement={};
    resultCompletedDailyHabits.forEach(ele => {
        //achievement
        let objKeys = Object.keys(ele).forEach(objKey => {
            if (objKey !== 'name') { 
                if(!completedDailyHabitsTemp.includes(ele[objKey])){                    
                    completedDailyHabitsTemp.push(ele[objKey]);
                    completedDailyHabitsAchievement[`${[objKey]}`] = ele[objKey];
                }
            }
        })
        //degree
        let completedDailyHabitsDegree = Object.keys(ele).length -1
        userDegree += (completedDailyHabitsDegree * 3)
    })
    achievements.push(completedDailyHabitsAchievement);
    // End Complete Habit


    // Perfect Days

    const perfectDaysHabit = await Habit.find({ user: userID });
    let resultPerfectDays = [], badDate = [];
    perfectDaysHabit.forEach(ele => {

        if ((ele.date.includes(ele.createdAt.toISOString().split('T')[0])) && (!badDate.includes(ele.createdAt.toISOString().split('T')[0]))) {
            if (!resultPerfectDays.includes(ele.createdAt.toISOString().split('T')[0])) {
                resultPerfectDays.push(ele.createdAt.toISOString().split("T")[0]);
            }
        }
        else {
            if (!badDate.includes(ele.createdAt.toISOString().split('T')[0])) {
                badDate.push(ele.createdAt.toISOString().split("T")[0]);
            }
            if (resultPerfectDays.includes(ele.createdAt.toISOString().split('T')[0])) { 
                resultPerfectDays.splice(resultPerfectDays.indexOf(ele.createdAt.toISOString().split("T")[0]), 1);
            }
        }
    })
    // Calculate Degree Achievement
    // Achievement
    let resultPerfectDaysObj = {};

    for(i=1; i<=resultPerfectDays.length; i++) {
        switch (i) {
            case 1: resultPerfectDaysObj[`completed_${i}`] = i; break;
            case 2: resultPerfectDaysObj[`completed_${i}`] = i; break;
            case 10: resultPerfectDaysObj[`completed_${i}`] = i; break;
            case 20: resultPerfectDaysObj[`completed_${i}`] = i; break;
            case 30: resultPerfectDaysObj[`completed_${i}`] = i; break;
            case 40: resultPerfectDaysObj[`completed_${i}`] = i; break;
            case 50: resultPerfectDaysObj[`completed_${i}`] = i; break;
            case 80: resultPerfectDaysObj[`completed_${i}`] = i; break;
            case 100: resultPerfectDaysObj[`completed_${i}`] = i; break;

        }
    }
    achievements.push(resultPerfectDaysObj);
    // Degree
    let perfectDaysDegree = await Habit.find({ user: userID, date: {$in: resultPerfectDays} })
    userDegree +=(perfectDaysDegree.length *3)        
    // End Perfect Days

    // Consecutive Days
    const consecutiveDaysHabit = await Habit.find({ user: userID });
    const consecutiveDaysCount = (dates) => {
        if (!dates || dates.length === 0) {
            return []; // Return an empty array if there are no dates
        }

        let streaks = []; // Array to store consecutive streak lengths
        let currentStreak = 1;

        // Sort the dates to ensure they are in ascending order
        dates.sort((a, b) => new Date(a) - new Date(b));

        for (let i = 1; i < dates.length; i++) {
            const diffInDays = (new Date(dates[i]) - new Date(dates[i - 1])) / (1000 * 60 * 60 * 24);

            if (diffInDays === 1) {
                currentStreak++;
            } else {
                streaks.push(currentStreak); // Add the streak length to the array
                currentStreak = 1; // Reset streak if there's a gap in dates
            }
        }

        // Add the last streak length
        streaks.push(currentStreak);

        return streaks;
    };

    let resultConsecutiveDays = [];
    consecutiveDaysHabit.forEach(ele => {
        if (ele.date.length > 1) {
            resultConsecutiveDays.push(consecutiveDaysCount(ele.date));
        }
    })

    // Calculate Degree And Achievement
    // Achievement
    let consecutiveDaysObj = {};
    resultConsecutiveDays.forEach(ele => {
        ele.forEach(val => {
            switch (val) {
                case 2: consecutiveDaysObj[`completed_${val}`] = val; break;
                case 3: consecutiveDaysObj[`completed_${val}`] = val; break;
                case 20: consecutiveDaysObj[`completed_${val}`] = val; break;
                case 30: consecutiveDaysObj[`completed_${val}`] = val; break;
                case 40: consecutiveDaysObj[`completed_${val}`] = val; break;
                case 50: consecutiveDaysObj[`completed_${val}`] = val; break;
                case 80: consecutiveDaysObj[`completed_${val}`] = val; break;
                case 100: consecutiveDaysObj[`completed_${val}`] = val; break;
            }
            // Degree 
            if(val>1){
                userDegree += 3
            }
        })
        
    })
    achievements.push([consecutiveDaysObj]);
    // End Consecutive Days
    const user = await User.findById(userID);
    userDegree += user.degree;
    userLevel = Math.floor(userDegree / 10); 
    // update user degree and level

    await User.findByIdAndUpdate(userID, { totalDegree: userDegree, level: userLevel});

    // send response depending on url
    if (req.url.split("/")[req.url.split("/").length - 1] === 'getUserAchievements') {
        res.status(200).json({
            status: 'success',
            requestTime: req.requestTime,
            //resultCompletedDailyHabits,
            //resultPerfectDays,
            //resultConsecutiveDays,
            achievements: {
                AcquiredHabits: achievements[0],
                PerfectDays: achievements[1],
                ConsecutiveDays: achievements[2],
            },
            userDegree,
            userLevel
        });
    }
    else {
        req.userDetails = {
            status: 'success',
            requestTime: req.requestTime,
            resultCompletedDailyHabits,
            resultPerfectDays,
            resultConsecutiveDays,
            achievements: {
                AcquiredHabits: achievements[0],
                PerfectDays: achievements[1],
                ConsecutiveDays: achievements[2],
            },
            userDegree,
            userLevel
        };
        next();
    }
})