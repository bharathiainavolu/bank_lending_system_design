
const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');

router.post('/loans', loanController.createLoan);
router.post('/loans/:loanId/payments', loanController.recordPayment);
router.get('/loans/:loanId/ledger', loanController.getLedger);
router.get('/customers/:customerId/overview', loanController.getCustomerOverview);

module.exports = router;
