const gulp = require('gulp');
const process = require('child_process');

function startDev(cb){
    const devProcess = process.exec(`npm start`, {
        env: {
            APPLICATION_ID: 'faas',
            GIT_USERNAME: 'joshuamshana',
            GIT_TOKEN: '8a5bcde4879365e109ec7c3454145494892446b6',
            PROJECT_ID: 'demofaas',
            GIT_CLONE_URL: 'https://github.com/joshuamshana/BFastFunctionExample.git'
        }
    });

    devProcess.on('exit', (code, signal)=>{
        console.log('dev server stops');
        cb();
    });

    devProcess.on('error', (err)=>{
        console.error(err);
        cb();
    });

    devProcess.stdout.on('data', (data)=>{
        console.log(data);
    });

    devProcess.stderr.on('data', (data)=>{
        console.log(data);
    });
}

exports.startDev = startDev;