const chai = require('chai');
const chai_http = require('chai-http');
const proxy = require('../src/proxy');

chai.use(chai_http);
chai.should();

describe('Proxy', function () {

    before(function () {
        process.env.PROJECT_ID = 'demo';
        process.env.APPLICATION_ID = 'faas';
        process.env.GIT_USERNAME = 'joshuamshana';
        process.env.GIT_TOKEN = '4583b8d19a8cb1ef403fe4d3b6eeff98b763345c';
        process.env.GIT_CLONE_URL = 'https://github.com/joshuamshana/BFastFunctionExample.git'
        console.log('before start');
    });

    describe('Deploy', function () {
        it('should deploy functions', function (done) {
            chai.request(proxy)
                .get('/deploy?appId=faas')
                .end((req, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    done();
                })
        })
    })
});
