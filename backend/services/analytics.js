const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const { addCalendarDays, currentMonth, dateParts, localDateAtEndOfDay, localDateAtMidnight, localDateKey } = require("../utils/dates");
const { fromPaise } = require("../utils/money");

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function getRange(query, timeZone, fallbackStart, fallbackEnd) {
  const today = localDateKey(new Date(), timeZone);
  const fromText = query.from || fallbackStart || today;
  const toText = query.to || fallbackEnd || today;
  const start = localDateAtMidnight(String(fromText), timeZone);
  const end = localDateAtEndOfDay(String(toText), timeZone);
  if (!start || !end || start > end) throw badRequest("Enter a valid date range.");
  return { start, end, fromText: String(fromText), toText: String(toText) };
}

function enforceRangeDays(range, maxDays) {
  const days = Math.ceil((range.end.getTime() - range.start.getTime()) / 86_400_000);
  if (days > maxDays) throw badRequest(`Choose a date range of ${maxDays} days or fewer.`);
}

async function groupedTotals(userId, range) {
  const match = { userId };
  if (range) match.date = { $gte: range.start, $lte: range.end };
  return Transaction.aggregate([
    { $match: match },
    { $group: { _id: "$type", totalPaise: { $sum: "$amountPaise" }, count: { $sum: 1 } } },
  ]);
}

async function getSummary(user, query) {
  let range = null;
  if (query.from || query.to) {
    range = getRange(query, user.timeZone);
    enforceRangeDays(range, 3660);
  }
  const [totals, transactionCount, recent] = await Promise.all([
    groupedTotals(user._id, range),
    Transaction.countDocuments({ userId: user._id, ...(range ? { date: { $gte: range.start, $lte: range.end } } : {}) }),
    Transaction.find({ userId: user._id, ...(range ? { date: { $gte: range.start, $lte: range.end } } : {}) }).sort({ date: -1, _id: -1 }).limit(6),
  ]);
  const incomePaise = totals.find((item) => item._id === "Income")?.totalPaise || 0;
  const expensePaise = totals.find((item) => item._id === "Expense")?.totalPaise || 0;
  return {
    totalIncome: fromPaise(incomePaise),
    totalExpenses: fromPaise(expensePaise),
    balance: fromPaise(incomePaise - expensePaise),
    transactionCount,
    recentTransactions: recent,
  };
}

async function getCategoryAnalysis(user, query) {
  const month = currentMonth(user.timeZone);
  const range = getRange(query, user.timeZone, `${month.year}-${String(month.month).padStart(2, "0")}-01`, undefined);
  enforceRangeDays(range, 3660);
  const entries = await Transaction.aggregate([
    { $match: { userId: user._id, type: "Expense", date: { $gte: range.start, $lte: range.end } } },
    { $group: { _id: "$category", amountPaise: { $sum: "$amountPaise" } } },
    { $sort: { amountPaise: -1 } },
  ]);
  const totalPaise = entries.reduce((sum, entry) => sum + entry.amountPaise, 0);
  return {
    totalExpenses: fromPaise(totalPaise),
    topCategory: entries[0]?.category || null,
    categories: entries.map((entry) => ({
      category: entry._id,
      amount: fromPaise(entry.amountPaise),
      percentage: totalPaise ? Math.round((entry.amountPaise / totalPaise) * 1000) / 10 : 0,
    })),
  };
}

async function getDailyAnalysis(user, query) {
  const today = localDateKey(new Date(), user.timeZone);
  const range = getRange(query, user.timeZone, addCalendarDays(today, -29), today);
  enforceRangeDays(range, 366);
  const rows = await Transaction.find({ userId: user._id, date: { $gte: range.start, $lte: range.end } }).select("type amountPaise date").lean();
  const days = new Map();
  for (let day = range.fromText; day <= range.toText; day = addCalendarDays(day, 1)) {
    days.set(day, { date: day, income: 0, expenses: 0 });
  }
  for (const row of rows) {
    const key = localDateKey(row.date, user.timeZone);
    const bucket = days.get(key);
    if (bucket) bucket[row.type === "Income" ? "income" : "expenses"] += row.amountPaise;
  }
  return [...days.values()].map((day) => ({ ...day, income: fromPaise(day.income), expenses: fromPaise(day.expenses) }));
}

async function getWeeklyAnalysis(user, query) {
  const today = localDateKey(new Date(), user.timeZone);
  const range = getRange(query, user.timeZone, addCalendarDays(today, -83), today);
  enforceRangeDays(range, 740);
  const rows = await Transaction.find({ userId: user._id, date: { $gte: range.start, $lte: range.end } }).select("type amountPaise date").lean();
  const weeks = new Map();
  for (let day = range.fromText; day <= range.toText; day = addCalendarDays(day, 1)) {
    const parts = dateParts(day);
    const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
    const weekStart = addCalendarDays(day, -((weekday + 6) % 7));
    if (!weeks.has(weekStart)) weeks.set(weekStart, { weekStart, weekEnd: addCalendarDays(weekStart, 6), incomePaise: 0, expensePaise: 0 });
  }
  for (const row of rows) {
    const day = localDateKey(row.date, user.timeZone);
    const parts = dateParts(day);
    const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
    const weekStart = addCalendarDays(day, -((weekday + 6) % 7));
    const bucket = weeks.get(weekStart);
    if (bucket) bucket[row.type === "Income" ? "incomePaise" : "expensePaise"] += row.amountPaise;
  }
  return [...weeks.values()].map((week) => ({
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    income: fromPaise(week.incomePaise),
    expenses: fromPaise(week.expensePaise),
  }));
}

async function getMonthlyAnalysis(user, query) {
  const current = currentMonth(user.timeZone);
  const year = query.year === undefined ? current.year : Number(query.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2200) throw badRequest("Enter a valid year.");
  const startText = `${year}-01-01`;
  const endText = `${year}-12-31`;
  const range = getRange({ from: query.from || startText, to: query.to || endText }, user.timeZone);
  enforceRangeDays(range, 366);
  const rows = await Transaction.find({ userId: user._id, date: { $gte: range.start, $lte: range.end } }).select("type amountPaise date").lean();
  const months = new Map();
  for (let month = 1; month <= 12; month += 1) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    months.set(key, { month: key, incomePaise: 0, expensePaise: 0 });
  }
  for (const row of rows) {
    const key = localDateKey(row.date, user.timeZone).slice(0, 7);
    const bucket = months.get(key);
    if (bucket) bucket[row.type === "Income" ? "incomePaise" : "expensePaise"] += row.amountPaise;
  }
  return [...months.values()].map((month) => ({ month: month.month, income: fromPaise(month.incomePaise), expenses: fromPaise(month.expensePaise) }));
}

async function getInsights(user) {
  const current = currentMonth(user.timeZone);
  const startText = `${current.year}-${String(current.month).padStart(2, "0")}-01`;
  const nextMonth = current.month === 12 ? { year: current.year + 1, month: 1 } : { year: current.year, month: current.month + 1 };
  const nextStartText = `${nextMonth.year}-${String(nextMonth.month).padStart(2, "0")}-01`;
  const previousMonthEnd = addCalendarDays(nextStartText, -1);
  const previousMonth = current.month === 1 ? { year: current.year - 1, month: 12 } : { year: current.year, month: current.month - 1 };
  const previousStartText = `${previousMonth.year}-${String(previousMonth.month).padStart(2, "0")}-01`;
  const currentRange = getRange({ from: startText, to: localDateKey(new Date(), user.timeZone) }, user.timeZone);
  const previousRange = getRange({ from: previousStartText, to: previousMonthEnd }, user.timeZone);

  const [currentRows, previousTotals, previousCategoryRows, budgetRows] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId: user._id, type: "Expense", date: { $gte: currentRange.start, $lte: currentRange.end } } },
      { $group: { _id: "$category", amountPaise: { $sum: "$amountPaise" } } },
      { $sort: { amountPaise: -1 } },
    ]),
    groupedTotals(user._id, previousRange),
    Transaction.aggregate([
      { $match: { userId: user._id, type: "Expense", date: { $gte: previousRange.start, $lte: previousRange.end } } },
      { $group: { _id: "$category", amountPaise: { $sum: "$amountPaise" } } },
    ]),
    Budget.find({ userId: user._id, month: current.month, year: current.year }).lean(),
  ]);
  const currentExpensePaise = currentRows.reduce((sum, row) => sum + row.amountPaise, 0);
  const previousExpensePaise = previousTotals.find((row) => row._id === "Expense")?.totalPaise || 0;
  const insights = [];

  if (currentRows[0]) {
    insights.push({ id: "top-category", message: `${currentRows[0]._id} is your highest spending category this month.`, category: currentRows[0]._id, amount: fromPaise(currentRows[0].amountPaise) });
    const previousCategorySpend = previousCategoryRows.find((row) => row._id === currentRows[0]._id)?.amountPaise || 0;
    if (previousCategorySpend > 0 && currentRows[0].amountPaise > previousCategorySpend) {
      insights.push({ id: "category-increase", message: `You spent more on ${currentRows[0]._id} this month than last month.`, category: currentRows[0]._id });
    }
    if (currentExpensePaise > 0) {
      const share = Math.round((currentRows[0].amountPaise / currentExpensePaise) * 100);
      insights.push({ id: "category-share", message: `${currentRows[0]._id} represents ${share}% of this month's expenses.`, category: currentRows[0]._id, percentage: share });
    }
    insights.push({ id: "category-total", message: `You spent ₹${fromPaise(currentRows[0].amountPaise).toLocaleString("en-IN")} on ${currentRows[0]._id} this month.`, category: currentRows[0]._id, amount: fromPaise(currentRows[0].amountPaise) });
  }
  if (previousExpensePaise > 0 && currentExpensePaise > previousExpensePaise) {
    const increase = Math.round(((currentExpensePaise - previousExpensePaise) / previousExpensePaise) * 100);
    insights.push({ id: "monthly-increase", message: `Your expenses are ${increase}% higher than last month.`, percentage: increase });
  } else if (currentExpensePaise > 0 && previousExpensePaise === 0) {
    insights.push({ id: "monthly-baseline", message: "You have started recording expenses this month; next month will provide a comparison." });
  }

  if (budgetRows.length) {
    const spendRows = await Transaction.aggregate([
      { $match: { userId: user._id, type: "Expense", date: { $gte: currentRange.start, $lte: currentRange.end } } },
      { $group: { _id: "$category", amountPaise: { $sum: "$amountPaise" } } },
    ]);
    const spentByCategory = new Map(spendRows.map((row) => [row._id, row.amountPaise]));
    for (const budget of budgetRows) {
      const spent = spentByCategory.get(budget.category) || 0;
      const percentage = Math.round((spent / budget.amountPaise) * 100);
      if (percentage >= 100) insights.push({ id: `budget-exceeded-${budget.category}`, message: `You have exceeded your ${budget.category} budget by ₹${fromPaise(spent - budget.amountPaise).toLocaleString("en-IN")}.`, category: budget.category, percentage });
      else if (percentage >= 80) insights.push({ id: `budget-near-${budget.category}`, message: `You have used ${percentage}% of your ${budget.category} budget.`, category: budget.category, percentage });
    }
  }
  return insights.slice(0, 8);
}

module.exports = { getCategoryAnalysis, getDailyAnalysis, getInsights, getMonthlyAnalysis, getSummary, getWeeklyAnalysis };
