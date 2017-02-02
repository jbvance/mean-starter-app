var express = require('express');
var router = express.Router();
var ctrlDpoas = require('../controllers/dpoas');

//Durable Powers of Attorney
router.post('/users/:userid/dpoas/', ctrlDpoas.dpoasCreate);
router.get('/users/:userid/dpoas/:dpoaid', ctrlDpoas.dpoasReadOne);
router.put('/users/:userid/dpoas/:dpoaid', ctrlDpoas.dpoasUpdateOne);
router.delete('/users/:userid/dpoas/:dpoaid', ctrlDpoas.dpoasDeleteOne);

module.exports = router;
