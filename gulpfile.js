const process = require('child_process');
const pkg = require('./package');
const gulp = require('gulp');

function startDev(cb) {
    const devProcess = process.exec(`npm start`, {
        env: {
            NPM_TOKEN: 'no-token',
            APPLICATION_ID: 'faas',
            GIT_USERNAME: 'joshuamshana',
            MASTER_KEY: 'faas',
            MODE: 'git',
            LOGS: '1',
            URL_TAR: 'https://github.com/fahamutech/bfast-database/releases/download/latest/bfast-database-latest.tgz',
            NPM_TAR: 'bfast-database',
            MONGO_URL: 'mongodb://localhost/daas',
            PORT: '3004',
            PRODUCTION: '1',
            PROJECT_ID: 'faas',
            GIT_CLONE_URL: 'https://github.com/joshuamshana/BFastFunctionExample.git'
        }
    });
    handleEvents(devProcess, cb);
}

function buildDockerImage(cb) {
    const buildImage = process.exec(`sudo docker build -t joshuamshana/bfastfunction:v${pkg.version} .`);
    handleEvents(buildImage, cb);
}

function buildDockerLatestImage(cb) {
    const buildImage = process.exec(`sudo docker build -t joshuamshana/bfastfunction:latest .`);
    handleEvents(buildImage, cb);
}

function pushToDocker(cb) {
    const pushImage = process.exec(`sudo docker push joshuamshana/bfastfunction:v${pkg.version}`);
    handleEvents(pushImage, cb);
}

function pushToLatestDocker(cb) {
    const pushImage = process.exec(`sudo docker push joshuamshana/bfastfunction:latest`);
    handleEvents(pushImage, cb);
}

function removeFunctionsFolder(cb) {
    const devProcess = process.exec(`rm -r ./src/function/myF`, {
        cwd: __dirname
    });
    handleEvents(devProcess, cb);
}

function handleEvents(childProcess, cb) {

    childProcess.on('exit', (code, signal) => {
        // console.log('remove example-functions stops');
        cb();
    });

    childProcess.on('error', (err) => {
        console.error(err);
        cb();
    });

    childProcess.stdout.on('data', (data) => {
        console.log(data);
    });

    childProcess.stderr.on('data', (data) => {
        console.log(data);
    });
}

exports.startDev = startDev;
exports.removeFunctionsFolder = removeFunctionsFolder;
exports.publishContainer = gulp.series(buildDockerImage, pushToDocker);
exports.publishContainerLatest = gulp.series(buildDockerLatestImage, pushToLatestDocker);
