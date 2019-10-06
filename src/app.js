const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const functionRouter = require('./routes/function');
const cors = require('cors');

const app = express();

app.use(cors());

app.use(logger('dev'));
app.use(express.json({
    limit: '2024mb'
}));
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

app.use('/faas/function', functionRouter);

module.exports = app;
