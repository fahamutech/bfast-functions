'use strict';

const childProcess = require('child_process');
const path = require('path');
const glob = require('glob');

module.exports.FaaSController = class {
    cloneOrUpdate(repoInfo) {
        if(repoInfo.repository.clone_url){
            childProcess.exec(`git clone ${repoInfo.repository.clone_url} myF`, {
                cwd: path.join(__dirname, '../function/')
            }, (error,stdout, stderr)=>{
                if(error){
                    console.log(stderr);
                }
                childProcess.exec('cd /faas/function/myF && git pull origin master', (error, stdout, stderr)=>{
                    if(error){
                        console.log(stderr);
                    }
                    setTimeout(()=>{
                        console.log('functions updated ==> ' + stdout);
                        childProcess.exec('pkill -u root');
                    },10000);
                });
            });
        }else{
            console.log('clone url not found');
        }
    }

    getNames() {
        return new Promise((resolve, reject) => {
            const result = [];
            glob(`${__dirname}/../function/**/*.js`, null, (err, files) => {
                if (err) {
                    reject({message: err});
                }
                files.forEach(element => {
                    const functionModule = require(element);
                    const functionNames = Object.keys(functionModule);
                    functionNames.forEach(functionName => {
                        result.push(functionName);
                    });
                });
                resolve({names: result});
            });
        });
    }
};
