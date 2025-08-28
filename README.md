# BFast Function

[![npm version](https://badge.fury.io/js/bfast-function.svg)](https://badge.fury.io/js/bfast-function)
[![Build Status](https://travis-ci.org/bfast-cloud/bfast-function.svg?branch=master)](https://travis-ci.org/bfast-cloud/bfast-function)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Code Quality](https://api.codacy.com/project/badge/Grade/e0b0c8d1e1b44d7e8a9b0e0e1b0e0e1b)](https://www.codacy.com/gh/bfast-cloud/bfast-function/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=bfast-cloud/bfast-function&amp;utm_campaign=Badge_Grade)

![BFast Function Banner](https://imgur.com/eJ5w43G.png)

**A serverless function engine for Node.js, built on top of Express.js and Socket.IO.**

BFast Function provides a powerful and flexible way to build and deploy serverless functions. It's designed to be easy to use, with a simple and intuitive API.

## Features

*   **Easy to use:** A simple and intuitive API for creating and deploying serverless functions.
*   **Flexible:** Supports both HTTP and Socket.IO functions.
*   **Scalable:** Built on top of Express.js and Socket.IO, which are known for their scalability.
*   **Extensible:** Can be easily extended with custom middleware and plugins.
*   **Open-source:** BFast Function is open-source and available on GitHub.

## Getting Started

There are several ways to get started with BFast Function:

**1. From npm:**

The easiest way to get started is to install BFast Function from npm:

```bash
npm install bfast-function
```

**2. From Git:**

You can also clone the BFast Function repository from GitHub:

```bash
git clone https://github.com/bfast-cloud/bfast-function.git
```

Then, install the dependencies:

```bash
cd bfast-function
npm install
```

**3. From a tarball:**

You can also download a tarball of the BFast Function repository from the [releases page](https://github.com/bfast-cloud/bfast-function/releases).

Then, extract the tarball and install the dependencies:

```bash
tar -xvf bfast-function-*.tar.gz
cd bfast-function-*
npm install
```

## Usage

1.  **Create a functions folder:**

    ```bash
    mkdir functions
    ```

2.  **Create a function file (e.g., `example.js`):**

    ```javascript
    const bfast = require('bfast');

    exports.myHttpFunction = bfast.functions().onHttpRequest('/hello', (request, response) => {
        response.status(200).send('Hello, World!');
    });

    exports.mySocketFunction = bfast.functions().onSocketIO('echo', (request, response) => {
        response.emit('echo', request.body);
    });
    ```

3.  **Start the BFast Function engine:**

    Create an `index.mjs` file in your root workspace and start the Faas server:

    ```javascript
    import {start} from 'bfast-function';

    start({
        port: '3000',
        functionsConfig: {
            functionsDirPath: './functions',
        }
    }).catch(console.log);
    ```

    Then, start the server:

    ```bash
    node index.mjs
    ```

## Docker

You can also run the BFast Function engine in a Docker container.

**1. Build the Docker image:**

```bash
docker build -t bfast-function .
```

**2. Run the Docker container:**

```bash
docker run -p 3000:3000 bfast-function
```

This will start the BFast Function engine and expose it on port 3000.


You can also mount a local functions folder to the container:

```bash
docker run -p 3000:3000 -v $(pwd)/functions:/app/functions bfast-function
```

This will mount the `functions` folder in your current working directory to the `/app/functions` folder in the container.

## Configuration

The `bfast.json` file is a JSON file that contains configurations for the BFast Function engine.

```json
{
  "ignore": ["**/node_modules/**"]
}
```

| Key      | Type    | Description                               |
| -------- | ------- | ----------------------------------------- |
| `ignore` | `Array` | An array of glob patterns to ignore when loading functions. |

## API Reference

For a full list of available options and APIs, please see the [API Reference](./src/models/options.mjs).

## Contributing

We welcome contributions to BFast Function! If you have an idea for a new feature or have found a bug, please open an issue on our [GitHub repository](https://github.com/bfast-cloud/bfast-function/issues).

## License

BFast Function is licensed under the [MIT License](./LICENSE).