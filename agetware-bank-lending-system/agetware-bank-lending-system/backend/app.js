
const express = require('express');
const dotenv = require('dotenv');
const loanRoutes = require('./routes/loanRoutes');

dotenv.config();
const app = express();
app.use(express.json());

app.use('/api/v1', loanRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
