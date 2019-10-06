'use strict';

// const childProcess = require('child_process');
// const path = require('path');
const glob = require('glob');

module.exports.FaaSController = class {

    /**
     * fetch functions from a git host, like github by provide repository information.
     * @param repo =  {
     *      repository: {
     *          clone_url: GIT_REMOTE_REPOSITORY
     *      },
     *      user: {
     *          username: GIT_REMOTE_USERNAME,
     *          token: ACCESS_TOKEN
     *      }
     * }
     * @returns {Promise<void>}
     */
    // async cloneOrUpdate(repo) {
    //     if (repo && repo.repository && repo.repository.clone_url) {
    //         try {
    //             childProcess.execSync(`rm -r myF || echo 'continues...'`,
    //                 {cwd: path.join(__dirname, '../function/')});
    //             console.log('clear function folder');
    //             await git.clone({
    //                 url: repo.repository.clone_url,
    //                 dir: path.join(__dirname, '../function/myF'),
    //                 depth: 1,
    //                 username: repo.user.username,
    //                 token: repo.user.token
    //             });
    //             // childProcess.execSync(
    //             //     `git clone ${repo.repository.clone_url} myF'`,
    //             //     {cwd: path.join(__dirname, '../function/')});
    //             console.log('done cloning git repository');
    //             childProcess.execSync(`npm install`,
    //                 {cwd: path.join(__dirname, '../function/myF/')});
    //             console.log('done install npm package');
    //             setTimeout(() => {
    //                 console.log('functions updated, engine will restart');
    //                 process.kill(process.pid);
    //             }, 3000);
    //             return await Promise.resolve()
    //         } catch (e) {
    //             // todo: send notification to email
    //             console.log(e);
    //             throw {message: e.toString()};
    //         }
    //     } else {
    //         console.log('clone url not found');
    //         throw {message: 'clone url not found'};
    //     }
    // }

    /**
     * get function from uploaded files. This function return an object which contain name of function as object property
     * and value of that property expected to be a function which accept Request (from express) and Response(from express)
     * @return functions = {
     *     [name]: function(request, response){
     *     // user defined function
     *     }
     * }
     */
    getFunctions() {
        return new Promise((resolve, reject) => {
            try {
                glob(`${__dirname}/../function/**/*.js`, {
                    // cwd: path.join(__dirname, `../function/`),
                    absolute: true,
                    ignore: ['**/node_modules/**', '**/specs/**', '**/*.specs.js']
                }, (err, files) => {
                    if (err) {
                        reject({message: err});
                    }
                    let functions = {
                        mambo: function (req, response) {
                            response.json({message: 'Powa!'});
                        }
                    };
                    files.forEach(file => {
                        const fileModule = require(file);
                        const functionNames = Object.keys(fileModule);
                        functionNames.forEach(name => {
                            functions[name] = fileModule[name];
                        });
                    });
                    resolve(functions);
                });
            } catch (e) {
                console.log(e);
                reject({message: e});
            }
        })
    }

    /**
     * Return names of all available function which user upload
     * @returns {Promise<{names: string[]}>}
     */
    getNames() {
        return new Promise(((resolve, reject) => {
            try {
                const names = [];
                glob(`${__dirname}/../function/**/*.js`, {
                    ignore: ['**/node_modules/**', '**/specs/**', '**/*.specs.js']
                }, (err, files) => {
                    if (err) {
                        reject({message: err});
                    }
                    files.forEach(file => {
                        const fileModule = require(file);
                        const functionNames = Object.keys(fileModule);
                        functionNames.forEach(name => {
                            names.push(name);
                        });
                    });
                    resolve({names: names});
                });
            } catch (e) {
                reject({message: e});
            }
        }))
    }

};
