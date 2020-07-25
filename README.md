# BFast::Cloud::Functions

Serverless function engine for NodeJS on top of ExpressJS and Socket.IO.

## Get Started Manually

When you use BFast::Cloud::Function you use this component automatically but if you want to use it
manually for your project here is the step to follow.

### 1. Install it using npm ( We assume you already create a project )

```shell script
john@pc:~/Desktop/my-workspace$ npm install bfast-faas
```

### 2. Create a functions folder

Create any folder in your working space

```shell script
john@pc:~/Desktop/my-workspace$ mkdir functions
```

### 3. Create a functions file ( your-name.js)

Create a file of any name and past the following code
```javascript
const {BFast} = require('bfastnode');

module.exports.myHelloFunction = BFast.functions().onHttpRequest('/hello', (request, response)=>{
    response.status(200).send('Hello, Workd!');
});
```

### 4. Start BFast::Functions engine

create index.js file in your root workspace and start the Faas server like the following

```javascript
const {FaaS} = require('bfast-faas');
const faasServer = new FaaS({
    port: '3000',
    functionsConfig: {
        functionsDirPath: './functions',
    }
});

faasServer.start().catch(console.log);

```

Full FaaS engine option is as follows

```javascript
 /**
     *
     * @param port {string} http server to listen to
     * @param gitCloneUrl {string} a remote git repository
     * @param gitUsername {string} a git username
     * @param gitToken {string} personal access token ( if a git repository is private )
     * @param appId {string} bfast::cloud application id
     * @param projectId {string} bfast::cloud projectId
     * @param functionsConfig {{
        functionsDirPath: string,
        bfastJsonPath: string
    }} if functions folder is local supply this, if exist faas engine will not use a git clone url
     * @param functionsController {FaaSController}
     */

  new FaaS({
    port: 3000,
    gitCloneUrl: 'https://your-repo.git',
    gitUsername: 'git username',
    gitToken: 'your token',
    appId: 'any',
    projectId: 'any',
    functionsConfig: {
        functionsDirPath: './your-functions-folder',
        bfastJsonPath: '/path-to-bfast-json-file'
    },
    functionsController: new MyCustomController()
});

```

