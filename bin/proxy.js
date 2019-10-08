
const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const app = express();
const path = require('path');
const childProcess = require('child_process');
const git = require('isomorphic-git');
const fs = require('fs');
git.plugins.set('fs', fs);

const username = process.env.GIT_USERNAME;
const token = process.env.GIT_TOKEN;
const cloneUrl = process.env.GIT_CLONE_URL;
const appId = process.env.APPLICATION_ID;
const projectId  = process.env.PROJECT_ID;
let faasForkPid = undefined;

app.use(cors());
app.use(logger('dev'));
app.use(express.json({
    limit: '2024mb'
}));
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

function auth(request, response, next){
    const aId = request.get('bfast-application-id');
    if(appId && appId!=='' && appId === aId){
        next();
    }else {
        response.status(401).json({message: 'Unauthorized request'});
    }
}

app.all('/deploy',(request, response, next)=>{auth(request, response, next)}, (request, response)=>{
    cloneFunctionsFromGit().then(value => {
        response.json({message: 'functions deployed'});
    }).catch(reason => {
        response.status(401).json(reason);
    }).finally(() => {
        startFaaSApp();
    });
});

app.all('/functions/:name', (request1, response1, next1)=>{auth(request1, response1, next1)}, (request, response)=>{
    const fName = request.params.name;
    const faasRequestFunction = http.request('http://localhost:3443/faas/function/' + fName,{
        method: request.method,
        hostname: 'localhost',
        headers: request.headers,
    }, faasResponse=>{
        response.headers = faasResponse.headers;
        response.statusCode = faasResponse.statusCode;
        faasResponse.pipe(response);
    });
    faasRequestFunction.on('error', (e) => {
        response.status(503).json({message: e.toString()});
    });
    faasRequestFunction.write(JSON.stringify(request.body));
    faasRequestFunction.end();
});

const startFaaSApp = () => {
    try{
        if(faasForkPid){
            process.kill(faasForkPid);
            faasForkPid = undefined;
        }
        const faasFork = childProcess.fork(`www`,[], {
            env: {
                APPLICATION_ID: appId,
                PROJECT_ID: projectId
            },
            cwd: path.join(__dirname)
        });
        faasForkPid = faasFork.pid;
        faasFork.on('exit', (code, signal)=>{
            console.log(`faas childProcess end with code: ${code} and signal: ${signal}`);
            faasForkPid = undefined;
        });
        faasFork.on('error', (err)=>{
            console.log(err);
        });
    }catch(e){
        console.log(e);
        faasForkPid = undefined;
    }
};

const cloneFunctionsFromGit = async ()=> {
    if(username && username !=='' && token && token !=='' && cloneUrl && cloneUrl !==''){
        try {
            childProcess.execSync(`rm -r myF || echo 'continues...'`,
                {cwd: path.join(__dirname, '../src/function/')});
            console.log('clear function folder');
            await git.clone({
                url: cloneUrl,
                dir: path.join(__dirname, '../src/function/myF'),
                depth: 1,
                username: username,
                token: token
            });
            console.log('done cloning git repository');
            childProcess.execSync(`npm install`,
                {cwd: path.join(__dirname, '../src/function/myF/')});
            console.log('done install npm package');
            return await Promise.resolve()
        } catch (e) {
            // todo: send notification to email
            console.log(e);
            throw {message: e.toString()};
        }
    }else{
        throw {message: 'please provide clone url and token to fetch your functions'};
    }
}

cloneFunctionsFromGit().catch(reason=>{
    console.log(reason);
}).finally(_=>{
    http.createServer(app).listen('3000').on('listening', async ()=>{
        console.log('proxy server start listening on port 3000');
        startFaaSApp();
    });
});
