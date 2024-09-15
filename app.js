const path = require("path");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");// allow access from all origins
const compression = require("compression");// for compression request

//security
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
// req from my modules
const userRouter = require("./routers/userRoutes");
const habitRouter = require("./routers/habitRoutes");
const moodRouter = require("./routers/moodRoutes");

// Import Error Function
const AppError = require("./utils/appError");
const globalHandlingError = require("./controllers/errorController");

const app = express();
// Middleware Functions...
// For Accept Input From User And Formate It As JSON...

app.use(cors());
app.options('*', cors()) // include before other routes
app.use(compression());

//security/ 2)helmet  to security http headers
app.use(helmet());

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "uploads/images")));
//security/3) data sanitization like when input {'$gt:""'} email field
app.use(mongoSanitize());

app.use(express.static(`{${__dirname}/public}`));
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use((req, res, next) => {
  console.log("Hello In Middleware Functions... 👋");
  next();
});
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

//security/ 1)limiter response

/*const limiter  = rateLimit({
  windowMs: 10*60*1000,
    max:60,
    message:' many requests come from this IP,please try in an hour...!'
});
app.use(limiter);*/
app.use(hpp());
// Routers
app.use("/users", userRouter);
app.use("/habits", habitRouter);
app.use("/moods", moodRouter);

// 1) Error Handling..., When Get Any Router Not Exist In Server...
app.all("*", (req, res, next) => {
  // res.status(404).json({
  //     status: '404 Not Found',
  //     message: `Can't find ${req.originalUrl} on this server.`
  // });
  // const err = new Error(`Can't find ${req.originalUrl} on this server`);
  // err.status = 'fail';
  // err.statusCode = 404;
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalHandlingError);
module.exports = app;
