const gulp = require('gulp');
const process = require('child_process');

function startDev(cb){
    const devProcess = process.exec(`npm start`, {
        env: {
            APPLICATION_ID: 'faas',
            GIT_USERNAME: 'joshuamshana',
            GIT_TOKEN: '86ihkjtgytujh',
            PROJECT_ID: 'demofaas',
            GIT_CLONE_URL: 'https://demo.com'
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