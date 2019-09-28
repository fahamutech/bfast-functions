const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const functionRouter = require('./routes/function');
const manageRouter = require('./routes/manage');
const cors = require('cors');

const app = express();

app.user()
app.use(cors());

app.use(logger('dev'));
app.use(express.json({
    limit: '2024mb'
}));
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

app.use('/faas/function', functionRouter);
app.use('/faas/manage', manageRouter);

module.exports = app;
