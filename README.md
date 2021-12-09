# BFast::Cloud::BfastFunctions

Serverless function engine for NodeJS on top of ExpressJS and Socket.IO.

## Get Started Manually

When you use BFast::Cloud::Function you use this component automatically but if you want to use it
manually for your project here is the step to follow.

### 1. Install required dependencies using npm

* bfast functions
```shell script
john@pc:~/Desktop/my-workspace$ npm install bfastfunction --save
```

* bfast client
```shell script
john@pc:~/Desktop/my-workspace$ npm install bfast --save
```


### 2. Create a functions folder

Create any folder in your working space

```shell script
john@pc:~/Desktop/my-workspace$ mkdir functions
```

### 3. Create a functions file ( e.g example.js )

Create a file of any name in functions folder you already create from step 2 and past the following code
```javascript
const bfast = require('bfast');

module.exports.myHelloFunction = bfast.functions().onHttpRequest('/hello', (request, response)=>{
    response.status(200).send('Hello, World!');
});
```

### 4. Start BfastFunctions engine

create index.mjs file in your root workspace and start the Faas server like the following

```javascript
const {start} = require('bfastfunction');
start({
    port: '3000',
    functionsConfig: {
        functionsDirPath: './functions',
    }
}).catch(console.log);

```

then to start listening run  `~$ node index.mjs`

[See full BfastFunctions option](./src/models/options.mjs)



bfast.json file is a JSON file contain configurations of for bfast functions engine. Its example is;

```json
{
  "ignore": ["**/node_modules/**"]
}
```

