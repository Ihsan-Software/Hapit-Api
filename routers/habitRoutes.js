const express = require('express');
const habitController = require('../controllers/habitController')
const authController = require('../controllers/authController')

const router = express.Router();

router.use(authController.protect_)

router.route('').post(habitController.createHabit);
// router.route('/getMyHabits/:specialTime').get(habitController.getTodayHabits);
router.route("/checkHabit/:checkHabitID").patch(habitController.setSpecialDayAndTime, habitController.check, habitController.userAchievements, habitController.getTodayHabits);
router.route('/unCheckHabit/:uncheckHabitID').patch(habitController.setSpecialDayAndTime, habitController.unCheck, habitController.userAchievements, habitController.getTodayHabits);
router.route('/getTodayHabits').get(habitController.setSpecialDayAndTime, habitController.getTodayHabits);
router.route("/getUserAchievements").get(habitController.userAchievements);
router.route("/statistics").get(habitController.statistics);
router.route('/:id').delete(habitController.deleteHabit);

router.use(authController.restrictTo('admin'))

router.route('').get(habitController.getHabits);
router.route('/:id').get(habitController.getHabit)
router.route('/:id').patch(habitController.updateHabit);
router.route('/:id').delete(habitController.deleteHabit);



module.exports = router;

/*
exports.gg = catchAsync(async (req, res, next) => {

    // Complete Habit
    userID = req.user.id    
    const completedDailyHabits = await Habit.aggregate([
        {   
            $match: {
                active: true
            }
        },
        {
            $group:{
                _id:'$user',
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
        console.log(group)
        filteredGroup = {}
        filteredGroup['name'] = group.Name[0];
        Object.keys(group).forEach(key => {
            if (key !== '_id' && key !== 'Name' && group[key][0] !== false) {
                filteredGroup[`${key}`] = parseInt(key.split("_")[1]);
            }
        });
        resultCompletedDailyHabits.push(filteredGroup);
    });


    // Perfect Days

    const perfectDaysHabit = await Habit.find({ user: req.user.id });
    let resultPerfectDaysHabit = [], badDate = [];
    perfectDaysHabit.forEach(ele => {

        if ((ele.date.includes(ele.createdAt.toISOString().split('T')[0]))&&(!badDate.includes(ele.createdAt.toISOString().split('T')[0]))) {
            if (!resultPerfectDaysHabit.includes(ele.createdAt.toISOString().split('T')[0])) {
                resultPerfectDaysHabit.push(ele.createdAt.toISOString().split("T")[0]);
            }
        }
        else {
            if (!badDate.includes(ele.createdAt.toISOString().split('T')[0])) {
                badDate.push(ele.createdAt.toISOString().split("T")[0]);
            }
            if (resultPerfectDaysHabit.includes(ele.createdAt.toISOString().split('T')[0])) { 
                resultPerfectDaysHabit.pop(resultPerfectDaysHabit.splice(resultPerfectDaysHabit.indexOf(ele.createdAt.toISOString().split("T")[0]), 1));
            }
        }
    })


    // Consecutive Days
    const consecutiveDays = await Habit.aggregate([
        {   
            $match: {
                user: new ObjectId(`${req.user.id}`)
            }
        },
        {
            $project: {
                user: 1,
                name: 1,
                date: 1
            }
        },
        {
            $unwind: "$date"
        },
        {
            $sort: { "date": 1 }
        },
        {
            $group: {
                _id: {
                    userId: "$user",
                    habitName: "$name"
                },
                completedDates: { $push: "$date" }
            }
        }
    ]);

    const consecutiveDaysCount = (dates) => {
    if (!dates || dates.length === 0) {
        return 0; // If there are no completed dates or it's undefined, streak is 0.
    }

    let maxStreak = 1; // At least one day completes the streak.
    let currentStreak = 1;

    // Sort the dates to ensure they are in ascending order
    dates.sort((a, b) => new Date(a) - new Date(b));

    for (let i = 1; i < dates.length; i++) {
        const diffInDays = (new Date(dates[i]) - new Date(dates[i - 1])) / (1000 * 60 * 60 * 24);

        if (diffInDays === 1) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 1; // Reset streak if there's a gap in dates
        }
    }

    return maxStreak;
};

    const resultConsecutiveDays = consecutiveDays.filter(habit => {
        const streak = consecutiveDaysCount(habit.completedDates);
        return streak
    });
    res.status(200).json({
        status: 'success',
        requestTime: req.requestTime,
        data:{
            completedDailyHabits,
            resultPerfectDaysHabit,
            resultConsecutiveDays
        }
    });
})
*/