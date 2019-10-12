const chai = require('chai');
const chai_http = require('chai-http');
const FaasProxy = require('../src/proxy');
const proxyServer = new FaasProxy({
    appId: 'faas',
    projectId: 'demo',
    gitCloneUrl: 'https://github.com/joshuamshana/BFastFunctionExample.git',
    gitUsername: 'joshuamshana',
    gitToken: '7bfd419a8cadfc92e13135f57acbab3d057bbd5c'
}).startProxyServer();

chai.use(chai_http);
chai.should();

describe('Proxy', function () {

    before(function () {

    });

    describe('Deploy', function () {
        it('should deploy functions', function (done) {
            chai.request(proxyServer)
                .get('/deploy')
                .end((req, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    done();
                })
        })
    })
});
