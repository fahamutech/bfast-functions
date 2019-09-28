'use strict';

const childProcess = require('child_process');
const path = require('path');
const glob = require('glob');

module.exports.FaaSController = class {

    cloneOrUpdate(repoInfo) {
        return new Promise((resolve, reject) => {
            if (repoInfo.repository.clone_url) {
                try {
                    const deleteMyF = childProcess.execSync(`rm -r myF || echo 'continues...'`,
                        {cwd: path.join(__dirname, '../function/')});
                    console.log(deleteMyF.toString());
                    const cloneMyF = childProcess.execSync(
                        `git clone ${repoInfo.repository.clone_url} myF || echo 'continues...'`,
                        {cwd: path.join(__dirname, '../function/')});
                    console.log(cloneMyF.toString());
                    const installMyF = childProcess.execSync(`npm install || echo'continues...'`,
                        {cwd: path.join(__dirname, '../function/myF/')});
                    console.log(installMyF.toString());
                    setTimeout(() => {
                        console.log('functions updated, engine will restart');
                        childProcess.exec('pkill -u root');
                    }, 5000);
                } catch (e) {
                    // send notification to email
                    console.log(e);
                }
            } else {
                console.log('clone url not found');
            }
            resolve('done')
        });
    }

    getFunctions() {
        let __fun = {
            mambo: function (req, response) {
                response.json({message: 'Powa!'});
            }
        };
        try {
            const files = glob.sync(`${__dirname}/../function/**/*.js`, {
                // cwd: path.join(__dirname, `../function/`),
                absolute: true,
                ignore: ['**/node_modules/**']
            });
            files.forEach(element => {
                const functionModule = require(element);
                const functionNames = Object.keys(functionModule);
                functionNames.forEach(functionName => {
                    __fun[functionName] = functionModule[functionName];
                });
            });
        } catch (e) {
            console.log(e);
        }
        return __fun;
    }

    getNames() {
        return new Promise((resolve, reject) => {
            const result = [];
            glob(`${__dirname}/../function/**/*.js`, {
                ignore: ['**/node_modules/**']
            }, (err, files) => {
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
