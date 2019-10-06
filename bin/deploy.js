
const server = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const app = express();

const username = process.env.GIT_USERNAME;
const token = process.env.GIT_TOKEN;
const cloneUrl = process.env.GIT_CLONE_URL;
const appId = process.env.APPLICATION_ID;

app.use(cors());
app.use(logger('dev'));
app.use(express.json({
    limit: '2024mb'
}));
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

function auth(request, response, next){
    const aId = request.get('bfast-application-id');

    console.log(appId);
    console.log(aId);

    if(appId && appId!=='' && appId === aId){
        next();
    }else {
        response.status(401).json({message: 'Unauthorized request'});
    }
}

app.use('/deploy',(request, response, next)=>{auth(request, response, next)}, (request, response)=>{
    if(username && token && cloneUrl){
        response.json({username: username, token: token, cloneUrl: cloneUrl});
    }else{
        response.status(403).json({message: 'please provide clone url and token to fetch your functions'})
    }
});

app.use('/functions', (request, response, next)=>{auth(request, response, next)}, (request, response)=>{
    response.json({message: 'proxy to function server'});
});

server.createServer(app).listen('3000');