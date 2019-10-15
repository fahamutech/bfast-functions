const chai = require('chai');
const chai_http = require('chai-http');
const FaasProxy = require('../src/proxy');

let proxyServer;
let faasProxy;

chai.use(chai_http);
chai.should();

describe('ProxyServer Routes', function () {

    describe('Deploy from public repository', function () {

        before(function () {
            proxyServer = new FaasProxy({
                appId: 'faas',
                projectId: 'demo',
                autoStartFaasEngine: false,
                testMode: true,
                gitCloneUrl: 'http://localhost:8174/BFastFunctionExample.git',
                // gitUsername: 'joshuamshana',
                // gitToken: 'b4ec4eac383a46215cd8e7f9ea00a20b9996549a'
            }).startProxyServer({port: '34556', autoInitializeClone: false});
        });

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
            this.timeout(3 * 60000);
            chai.request(proxyServer)
                .get('/deploy')
                .set('bfast-application-id', 'faas')
                .end((req, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.message.should.equal('functions deployed');
                    done();
                })
        });

        it('should accept to deploy functions because appId is supplied as query param', function (done) {
            this.timeout(3 * 60000);
            chai.request(proxyServer)
                .get('/deploy')
                .query('appId=faas')
                .end((req, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.message.should.equal('functions deployed');
                    done();
                })
        });

    });

    describe('Functions', function () {

        before(function (done) {
            this.timeout(2 * 60000);
            faasProxy = new FaasProxy({
                appId: 'faas',
                projectId: 'demo',
                autoStartFaasEngine: false,
                testMode: true,
                gitCloneUrl: 'http://localhost:8174/BFastFunctionExample.git',
                // gitUsername: 'joshuamshana',
                // gitToken: 'b4ec4eac383a46215cd8e7f9ea00a20b9996549a'
            });
            proxyServer = faasProxy.startProxyServer({port: '34556', autoInitializeClone: true});
            setTimeout(done, 3000);
        });

        after(function () {
            faasProxy._stopFaasEngine();
        });

        it('should not call a function without appId to be supplied and function exist', function (done) {
            chai.request(proxyServer)
                .get('/functions/hello')
                .end((req, res) => {
                    res.should.have.status(401);
                    res.body.should.be.a('object');
                    res.body.message.should.be.a('string');
                    res.body.message.should.equal('Unauthorized request');
                    done();
                });
        });

        it('should not call a function without appId to be supplied and function does not exist', function (done) {
            chai.request(proxyServer)
                .get('/functions/hellg5867tguyo')
                .end((req, res) => {
                    res.should.have.status(401);
                    res.body.should.be.a('object');
                    res.body.message.should.be.a('string');
                    res.body.message.should.equal('Unauthorized request');
                    done();
                });
        });

        it('should return function contents when appId applied', function (done) {
            chai.request(proxyServer)
                .get('/functions/hello')
                .set('bfast-application-id', 'faas')
                .end((req, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.message.should.be.a('string');
                    res.body.message.should.equal('Hello, World!');
                    done();
                });
        });

        it('should return function contents when appId supplier in query params', function (done) {
            chai.request(proxyServer)
                .get('/functions/hello')
                .query('appId=faas')
                .end((req, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.message.should.be.a('string');
                    res.body.message.should.equal('Hello, World!');
                    done();
                });
        });

        it('should return not found if function not exist', function (done) {
            chai.request(proxyServer)
                .get('/functions/hello98078778ui')
                .set('bfast-application-id', 'faas')
                .end((req, res) => {
                    res.should.have.status(404);
                    res.body.should.be.a('object');
                    // res.body.message.should.be.a('string');
                    // res.body.should.({});
                    done();
                });
        });

    });

});
