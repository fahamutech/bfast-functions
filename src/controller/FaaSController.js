'use strict';

const glob = require('glob');

class FaaSController {

    /**
     * get function from uploaded files. This function return an object which contain name of function as object property
     * and value of that property expected to be a function which accept Request (from express) and Response(from express)
     * @return Promise<any>
     */
    getFunctions() {
        return new Promise((resolve, reject) => {
            try {
                const bfastConfig = require('../function/myF/bfast.json');
                glob(`${__dirname}/../function/**/*.js`, {
                    // cwd: path.join(__dirname, `../function/`),
                    absolute: true,
                    ignore: bfastConfig && bfastConfig.ignore && Array.isArray(bfastConfig.ignore) ?
                        bfastConfig.ignore :
                        ['**/node_modules/**', '**/specs/**', '**/*.specs.js']
                }, (err, files) => {
                    if (err) {
                        reject({message: err});
                    }
                    let functions = {
                        mambo: {
                            onRequest: function (req, response) {
                                response.json({message: 'Powa!'});
                            }
                        }
                    };
                    files.forEach(file => {
                        const fileModule = require(file);
                        const functionNames = Object.keys(fileModule);
                        functionNames.forEach(name => {
                            if (fileModule[name] && typeof fileModule[name] === "object") {
                                functions[name] = fileModule[name];
                            }
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
                const bfastConfig = require('../function/myF/bfast.json');
                // console.log(bfastConfig);
                // console.log(bfastConfig && bfastConfig.ignore && Array.isArray(bfastConfig.ignore));
                const names = [];
                glob(`${__dirname}/../function/**/*.js`, {
                    ignore: bfastConfig && bfastConfig.ignore && Array.isArray(bfastConfig.ignore) ?
                        bfastConfig.ignore :
                        ['**/node_modules/**', '**/specs/**', '**/*.specs.js']
                }, (err, files) => {
                    if (err) {
                        reject({message: err});
                    }
                    files.forEach(file => {
                        const fileModule = require(file);
                        const functionNames = Object.keys(fileModule);
                        functionNames.forEach(name => {
                            if (fileModule[name] && typeof fileModule[name] === "object"
                                && fileModule[name].onRequest) {
                                names.push(name);
                            }
                        });
                    });
                    resolve({names: names});
                });
            } catch (e) {
                reject({message: e.toString()});
            }
        }));
    }

}

module.exports = FaaSController;
