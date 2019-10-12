'use strict';

const glob = require('glob');

module.exports.FaaSController = class {

    /**
     * get function from uploaded files. This function return an object which contain name of function as object property
     * and value of that property expected to be a function which accept Request (from express) and Response(from express)
     * @return functions = {
     *     [name]: function(request, response){
     *            // business logic
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
