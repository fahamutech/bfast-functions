const chai = require('chai');
const chai_http = require('chai-http');
const FaasProxy = require('../src/proxy');
const proxyServer = new FaasProxy({
    appId: 'faas',
    projectId: 'demo',
    gitCloneUrl: 'https://github.com/joshuamshana/BFastFunctionExample.git',
    gitUsername: 'joshuamshana',
    gitToken: '644c3ddac952e3ce9407602e6b802d5b70177453'
}).startProxyServer({port: '34556', autoInitializeClone: false});

chai.use(chai_http);
chai.should();

describe('Proxy', function () {

    describe('Deploy', function () {

        it('should not accept to deploy functions, because no appId supplied', function (done) {
            chai.request(proxyServer)
                .get('/deploy')
                .end((req, res) => {
                    res.should.have.status(401);
                    res.body.should.be.a('object');
                    res.body.message.should.be.a('string');
                    res.body.message.should.equal('Unauthorized request');
                    done();
                })
        });

        it('should accept to deploy functions because appId is supplied as header', function (done) {
            before(function () {
                this.timeout(20000);
            });
            chai.request(proxyServer)
                .get('/deploy')
                .set('bfast-application-id', 'faas')
                .end((req, res) => {
                    console.log(res.body);
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.message.equal('functions deployed');
                    done();
                })
        });

        it('should accept to deploy functions because appId is supplied as query param', function (done) {
            before(function () {
                this.timeout(20000);
            });
            chai.request(proxyServer)
                .get('/deploy?appId=faas')
                // .query('appId', 'faas')
                .end((req, res) => {
                    console.log(res.body);
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.message.equal('functions deployed');
                    done();
                })
        });
    })
});
