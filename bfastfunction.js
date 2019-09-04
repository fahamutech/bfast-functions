'use strict';
const glob = require('glob');
const MongoClient = require('mongodb').MongoClient;
// const url = 'mongodb://mdb:27017/daas';
// const client = new MongoClient(url, { useNewUrlParser: true });
// global.BFast = {};
// BFast.database = client;

let BFastFunction;
(function () {
    let instance;
    BFastFunction = function BFastFunction() {
        if (instance) {
            return instance;
        }
        instance = this;
        return instance;
    };
})();

(function () {
    try {
        const files = glob.sync(`**/*.js`, {
            cwd:`${__dirname}/function/`,
            absolute: true,
            ignore: ['**/node_modules/**']
        });
        files.forEach(element => {
            // console.log(element);
            const functionModule = require(element);
            const functionNames = Object.keys(functionModule);
            functionNames.forEach(functionName => {
                BFastFunction[functionName] = functionModule[functionName];
            });
        });
    } catch (e) {
        console.log(e);
    }
})();

module.exports = BFastFunction;
