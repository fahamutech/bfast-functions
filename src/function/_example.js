exports.hello = (request, response) => {
    response.json({message: 'Hello, World!'});
};

const router = require('express').Router();

router.get('/test', (re, res) => {
    res.json({message: 'from express router'})
});

exports.ty = [(req, res) => {
}, (req1, res1) => {
}];

exports.t = router;
