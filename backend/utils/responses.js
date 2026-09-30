const { fromPaise } = require("./money");

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    timeZone: user.timeZone,
  };
}

function publicTransaction(transaction) {
  return {
    id: String(transaction._id),
    type: transaction.type,
    amount: fromPaise(transaction.amountPaise),
    category: transaction.category,
    description: transaction.description,
    date: transaction.date,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
}

function publicBudget(budget, spentPaise = 0) {
  const remainingPaise = budget.amountPaise - spentPaise;
  return {
    id: String(budget._id),
    category: budget.category,
    month: budget.month,
    year: budget.year,
    amount: fromPaise(budget.amountPaise),
    spent: fromPaise(spentPaise),
    remaining: fromPaise(remainingPaise),
    percentageUsed: budget.amountPaise ? Math.round((spentPaise / budget.amountPaise) * 100) : 0,
  };
}

module.exports = { publicBudget, publicTransaction, publicUser };
