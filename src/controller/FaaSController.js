const glob = require('glob');

class FaaSController {

    /**
     * get function from uploaded files. This function return an object which contain name of function as object property
     * and value of that property expected to be a function which accept Request (from express) and Response(from express)
     *  options to specify example-functions folder and bfast.json path to get configuration
     *  like files to ignore
     * @param options {{
        functionsDirPath: string,
        bfastJsonPath: string
    }}
     * @return Promise<{[string]:{path: string,onRequest: Function, method: string,onGuard: Function}}>
     */
    getFunctions(options) {
        if (!options) {
            options = {
                functionsDirPath: `${__dirname}/../function`,
                bfastJsonPath: `${__dirname}/../function/myF/bfast.json`
            }
        }
        return new Promise((resolve, reject) => {
            try {
                let bfastConfig;
                try {
                    bfastConfig = require(options.bfastJsonPath);
                } catch (e) {
                    console.warn('cant find bfast.json');
                }
                glob(`${options.functionsDirPath}/**/*.js`, {
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
                            onRequest: function (request, response) {
                                response.json({message: 'Powa!'});
                            }
                        }
                    };
                    for (const file of files) {
                        const functionsFile = require(file);
                        const functionNames = Object.keys(functionsFile);
                        for (const functionName of functionNames) {
                            if (functionsFile[functionName] && typeof functionsFile[functionName] === "object") {
                                functions[functionName] = functionsFile[functionName];
                            }
                        }
                    }
                    delete functions.mambo;
                    resolve(functions);
                });
            } catch (e) {
                reject({message: e});
            }
        });
    }

}

module.exports = {
    FaaSController
};
