const mongoose = require('mongoose');
const validator = require('validator')

const bcrypt = require('bcryptjs'); // for encrypt passowrd from user and compare when login...


const userSchema = new mongoose.Schema({
    name:{
        type: String,
        require:[true, 'Enter Your Name']
    },

    email: {
        type: String,
        unique: true,
        require: [true,'Enter Your Email'],
        lowercase:true,
        validate: [validator.isEmail, 'Enter Your Valid Email']
    },

    photo:{
        type: String,
        default: 'default.jpg'
    },
    bio:{
        type: String,
        default: ''
    },

    password:{
        type: String,
        require: [true,'Enter Your Password'],
        minlength:8,
        select:false
    },

    role:{
        type: String,
        enum:['user', 'guest', 'admin'],
        default: 'user'
    },
    totalDegree: {
        type: String,
        default: '0'
    },
    level: {
        type: String,
        default: '0'
    },
    todayOpen: {
        type: Date,
        default: new Date()
    },
    degree: {
        type: String,
        default: '0'
    }

},
    {timestamps: true},
    /*{
    toJSON:{virtuals: true},
    toObject:{virtuals: true}
    }*/
);

userSchema.virtual('Habits',{
    ref: 'Habit',
    foreignField: 'user',
    localField: '_id'
});

userSchema.virtual('Moods',{
    ref: 'Mood',
    foreignField: 'user',
    localField: '_id'
});


userSchema.pre(/^find/, function(next){
    this.find().select('-__v')
    next();
})
// Middleware Functions(document) For Encrypt Passowrd...
userSchema.pre('save', async function (next) {
    if(!this.isModified('password')) return next();

    this.password = await bcrypt.hash(this.password, 12);

    next();
});

const setImageURL = (doc) => {
    if (doc.photo) {
        const imageUrl = `${process.env.SERVER_URL}/users/${doc.photo}`;
        doc.photo = imageUrl;
    }
};
// findOne, findAll and update
userSchema.post("init", (doc) => {
    setImageURL(doc);
});

// create
userSchema.post("save", (doc) => {
    setImageURL(doc);
});



// Instance Method For Curent Document(user)...

// Use it for login ot check if input password is same password stored in DB
userSchema.methods.correctPassword = async function( candidatePassword, userPassword){
    return await bcrypt.compare(candidatePassword, userPassword)
};

// Use it for protect_ to check if user change password after token is created
userSchema.methods.changedPasswordAfter = function(JWTTimestamp){
    if(this.passwordChangedAt){
        const changedPasswordTime = parseInt(this.passwordChangedAt.getTime()/1000, 10);
        return JWTTimestamp<changedPasswordTime
    }
    return false;
}

const User = mongoose.model('User',userSchema);
module.exports = User;