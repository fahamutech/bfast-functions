'use strict';
const glob = require('glob');

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
}());

(function () {
    try {
        const files = glob.sync(`${__dirname}/function/**/*.js`);
        files.forEach(element => {
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
