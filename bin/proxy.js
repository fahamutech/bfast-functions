
const server = require('http');
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
    cloneFunctionsFromGit().then(value=>{
        response.json({message: 'functions deployed'});
    }).catch(reason=>{
        response.status(403).json({err: reason.toString()});
    });
});

app.use('/functions', (request, response, next)=>{auth(request, response, next)}, (request, response)=>{
    response.json({message: 'proxy to function server'});
});

const startFaaSApp = ()=>{
    const faasSpawn = childProcess.exec(`node www`, {
        env: {
            APPLICATION_ID: appId,
            PROJECT_ID: projectId
        },
        cwd: path.join(__dirname)
    });
    faasSpawn.on('exit', (code, signal)=>{
        console.log(`faas childProcess end with code: ${code} and signal: ${signal}`);
    });
    faasSpawn.stdout.on('data', (data)=>{
        console.log(data);
    });
    faasSpawn.on('error', (err)=>{
        console.log(err);
    });
    faasSpawn.stderr.on('data', (data)=>{
        console.log(data);
    });
};

const cloneFunctionsFromGit = async ()=>{
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

cloneFunctionsFromGit().then(value=>{
    server.createServer(app).listen('3000').on('listening', async ()=>{
        startFaaSApp();
    });
}).catch(reason=>{
    console.log(reason);
    process.kill(process.pid);
});
