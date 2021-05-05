const express = require('express');
const fs = require('fs');
const morgan = require('morgan');
// const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const AppError = require('./utils/appError');
const GlobalHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const redis = require('redis');
const moment = require('moment');

//MY MIDDLEWARE
// const rateLimiterByMe = require('./middlewares/rateLimiterByMe');

const app = express();

// 1) GLOBAL MIDDLEWARES

app.use(helmet());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const redisClient = redis.createClient();
const WINDOW_SIZE_IN_HOURS = 24;
const MAX_WINDOW_REQUEST_COUNT = 6;


const rateLimiterByMe = (req, res, next) => {
    // fetch records of current user using IP address, returns null when no record is found
    redisClient.get(req.ip, function(err, record) {
      if (err) return next(new AppError(err, 404));
      const currentRequestTime = moment();
      console.log(record);
      //  if no record is found , create a new record for user and store to redis
      if (record == null) {
        let newRecord = [];
        let requestLog = {
          requestTimeStamp: currentRequestTime.unix(),
          requestCount: 1
        };
        newRecord.push(requestLog);
        redisClient.set(req.ip, JSON.stringify(newRecord));
        next();
      }
      // if record is found, parse it's value and calculate number of requests users has made within the last window
      let data = JSON.parse(record);
      let windowStartTimestamp = moment()
        .subtract(WINDOW_SIZE_IN_HOURS, 'hours')
        .unix();
      let requestsWithinWindow = data.filter(entry => {
        return entry.requestTimeStamp > windowStartTimestamp;
      });
      console.log('requestsWithinWindow', requestsWithinWindow);
      let totalWindowRequestsCount = requestsWithinWindow.reduce((accumulator, entry) => {
        return accumulator + entry.requestCount;
      }, 0);
      // if number of requests made is greater than or equal to the desired maximum, return error
      if (totalWindowRequestsCount >= MAX_WINDOW_REQUEST_COUNT) {
        return next(new AppError('more than limit!', 404));
      } else {
        // // if number of requests made is less than allowed maximum, log new entry
        let lastRequestLog = data[data.length - 1];
          lastRequestLog.requestCount++;
          data[data.length - 1] = lastRequestLog;
        redisClient.set(req.ip, JSON.stringify(data));
        next();
      }
    });
};
app.use('/api', rateLimiterByMe);

app.use(express.json());

app.use(mongoSanitize());
app.use(xss());
app.use(
  hpp({
    whitelist: ['duration'],
  })
);

app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  console.log('Hello from the Middleware!');
  next();
});

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3) ROUTES

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on the server!`, 404));
});

app.use(GlobalHandler);
module.exports = app;
