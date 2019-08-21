const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const indexRouter = require('./routes/index');
const manageRouter = require('./routes/manage');
const cors = require('cors');

const app = express();

app.use(cors());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());


app.use('/faas/function', indexRouter);
app.use('/faas/manage', manageRouter);

module.exports = app;
