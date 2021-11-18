# BFast::Cloud::BfastFunctions

Serverless function engine for NodeJS on top of ExpressJS and Socket.IO.

## Get Started Manually

When you use BFast::Cloud::Function you use this component automatically but if you want to use it
manually for your project here is the step to follow.

### 1. Install required dependencies using npm

* bfast-faas
```shell script
john@pc:~/Desktop/my-workspace$ npm install bfast-faas --save
```

* bfastnode
```shell script
john@pc:~/Desktop/my-workspace$ npm install bfastnode --save
```


### 2. Create a functions folder

Create any folder in your working space

```shell script
john@pc:~/Desktop/my-workspace$ mkdir functions
```

### 3. Create a functions file ( e.g example.js )

Create a file of any name in functions folder you already create from step 2 and past the following code
```javascript
const {BFast} = require('bfastnode');

module.exports.myHelloFunction = BFast.functions().onHttpRequest('/hello', (request, response)=>{
    response.status(200).send('Hello, World!');
});
```

### 4. Start BfastFunctions engine

create index.mjs file in your root workspace and start the Faas server like the following

```javascript
const {BfastFunctions} = require('bfast-faas');
const faasServer = new BfastFunctions({
    port: '3000',
    functionsConfig: {
        functionsDirPath: './functions',
    }
});

faasServer.start().catch(console.log);

```

then to start listening run  `~$ node index.mjs`

Full BfastFunctions engine option is as follows

```javascript
 /**
     *
     * @param port {string} a port http server to listen to [required]
     * @param gitCloneUrl {string} a remote git repository [required]
     * @param gitUsername {string} a git username [required]
     * @param gitToken {string} personal access token ( if a git repository is private ) [optional, default is null]
     * @param appId {string} bfast::cloud application id [optional, default is null]
     * @param projectId {string} bfast::cloud projectId [optional, default is null]
     * @param functionsConfig {{
        functionsDirPath: string, 
        bfastJsonPath: string
    }} if functionsDirPath is specified bfast::functions engine will not use a git clone url [optional, default is null]
     * @param functionsController {FunctionsResolverController} your implementation o bfast functions controllers or null [optional, default is null]
     */

  new BfastFunctions({
    port: "3000",
    gitCloneUrl: 'https://your-repo.git',
    gitUsername: 'git username',
    gitToken: 'your token',
    appId: 'any',
    projectId: 'any',
    functionsConfig: {
        functionsDirPath: '/path/to/your-functions-folder',
        bfastJsonPath: '/path/to/bfast-json-file'
    },
    functionsController: new MyCustomController()
});

```

bfast.json file is a JSON file contain configurations of for bfast functions engine. Its example is;

```json
{
  "ignore": ["**/node_modules/**"]
}
```

