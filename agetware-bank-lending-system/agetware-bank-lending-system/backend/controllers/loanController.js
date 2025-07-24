
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');

exports.createLoan = (req, res) => {
  const { customer_id, loan_amount, loan_period_years, interest_rate_yearly } = req.body;
  if (!customer_id || !loan_amount || !loan_period_years || !interest_rate_yearly) {
    return res.status(400).json({ message: "Invalid input data." });
  }
  const P = parseFloat(loan_amount);
  const N = parseInt(loan_period_years);
  const R = parseFloat(interest_rate_yearly);
  const interest = P * N * (R / 100);
  const total = P + interest;
  const emi = parseFloat((total / (N * 12)).toFixed(2));
  const loan_id = uuidv4();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO Loans (loan_id, customer_id, principal_amount, total_amount, interest_rate, loan_period_years, monthly_emi, status, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
    [loan_id, customer_id, P, total, R, N, emi, now],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      return res.status(201).json({
        loan_id, customer_id,
        total_amount_payable: total,
        monthly_emi: emi
      });
    }
  );
};

exports.recordPayment = (req, res) => {
  const { loanId } = req.params;
  const { amount, payment_type } = req.body;
  const now = new Date().toISOString();
  const payment_id = uuidv4();
  if (!amount || !payment_type) {
    return res.status(400).json({ message: "Invalid input." });
  }

  db.get(`SELECT * FROM Loans WHERE loan_id = ?`, [loanId], (err, loan) => {
    if (err || !loan) return res.status(404).json({ message: "Loan not found." });

    const new_total_paid = (loan.amount_paid || 0) + amount;
    const remaining_balance = loan.total_amount - new_total_paid;
    const emis_left = Math.ceil(remaining_balance / loan.monthly_emi);

    db.run(`INSERT INTO Payments (payment_id, loan_id, amount, payment_type, payment_date) VALUES (?, ?, ?, ?, ?)`,
      [payment_id, loanId, amount, payment_type, now]);

    db.run(`UPDATE Loans SET amount_paid = ?, status = ?, emis_left = ? WHERE loan_id = ?`,
      [new_total_paid, remaining_balance <= 0 ? 'PAID_OFF' : 'ACTIVE', emis_left, loanId]);

    return res.status(200).json({
      payment_id,
      loan_id: loanId,
      message: "Payment recorded successfully.",
      remaining_balance: parseFloat(remaining_balance.toFixed(2)),
      emis_left
    });
  });
};

exports.getLedger = (req, res) => {
  const { loanId } = req.params;
  db.get(`SELECT * FROM Loans WHERE loan_id = ?`, [loanId], (err, loan) => {
    if (err || !loan) return res.status(404).json({ message: "Loan not found." });
    db.all(`SELECT * FROM Payments WHERE loan_id = ? ORDER BY payment_date ASC`, [loanId], (err, payments) => {
      if (err) return res.status(500).json({ error: err.message });
      const paid = payments.reduce((sum, tx) => sum + tx.amount, 0);
      const balance = loan.total_amount - paid;
      const emis_left = Math.ceil(balance / loan.monthly_emi);
      res.json({
        loan_id: loan.loan_id,
        customer_id: loan.customer_id,
        principal: loan.principal_amount,
        total_amount: loan.total_amount,
        monthly_emi: loan.monthly_emi,
        amount_paid: paid,
        balance_amount: parseFloat(balance.toFixed(2)),
        emis_left,
        transactions: payments
      });
    });
  });
};

exports.getCustomerOverview = (req, res) => {
  const { customerId } = req.params;
  db.all(`SELECT * FROM Loans WHERE customer_id = ?`, [customerId], (err, loans) => {
    if (err || loans.length === 0) return res.status(404).json({ message: "No loans found." });
    const overview = loans.map(loan => {
      const interest = loan.total_amount - loan.principal_amount;
      return {
        loan_id: loan.loan_id,
        principal: loan.principal_amount,
        total_amount: loan.total_amount,
        total_interest: interest,
        emi_amount: loan.monthly_emi,
        amount_paid: loan.amount_paid || 0,
        emis_left: loan.emis_left || Math.ceil((loan.total_amount - (loan.amount_paid || 0)) / loan.monthly_emi)
      };
    });
    res.json({
      customer_id: customerId,
      total_loans: overview.length,
      loans: overview
    });
  });
};
