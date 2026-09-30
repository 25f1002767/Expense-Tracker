const { Router } = require("express");
const mongoose = require("mongoose");
const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const { requireAuth } = require("../middleware/auth");
const { currentMonth, localDateAtMidnight } = require("../utils/dates");
const { EXPENSE_CATEGORIES } = require("../utils/categories");
const { toPaise } = require("../utils/money");
const { publicBudget } = require("../utils/responses");

const router = Router();
router.use(requireAuth);

function readBudgetFields(body) {
  const category = body.category;
  const amountPaise = toPaise(body.amount);
  const month = Number(body.month);
  const year = Number(body.year);
  if (!EXPENSE_CATEGORIES.includes(category)) return { error: "Choose a valid expense category." };
  if (!amountPaise) return { error: "Budget amount must be greater than 0 and have at most two decimal places." };
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2200) {
    return { error: "Choose a valid budget month and year." };
  }
  return { value: { category, amountPaise, month, year } };
}

function monthBounds(year, month, timeZone) {
  const startText = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextText = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  const nextStart = localDateAtMidnight(nextText, timeZone);
  const start = localDateAtMidnight(startText, timeZone);
  return { start, end: nextStart ? new Date(nextStart.getTime() - 1) : null };
}

router.post("/", async (request, response) => {
  const validated = readBudgetFields(request.body);
  if (validated.error) return response.status(400).json({ message: validated.error });
  const budget = await Budget.create({ ...validated.value, userId: request.user._id });
  return response.status(201).json({ budget: publicBudget(budget) });
});

router.get("/", async (request, response) => {
  const current = currentMonth(request.user.timeZone);
  const month = request.query.month === undefined ? current.month : Number(request.query.month);
  const year = request.query.year === undefined ? current.year : Number(request.query.year);
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2200) {
    return response.status(400).json({ message: "Choose a valid budget month and year." });
  }
  const budgets = await Budget.find({ userId: request.user._id, month, year }).sort({ category: 1 }).lean();
  const bounds = monthBounds(year, month, request.user.timeZone);
  const spend = await Transaction.aggregate([
    { $match: { userId: request.user._id, type: "Expense", date: { $gte: bounds.start, $lte: bounds.end } } },
    { $group: { _id: "$category", amountPaise: { $sum: "$amountPaise" } } },
  ]);
  const spentByCategory = new Map(spend.map((row) => [row._id, row.amountPaise]));
  return response.json({ budgets: budgets.map((budget) => publicBudget(budget, spentByCategory.get(budget.category) || 0)) });
});

router.put("/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Invalid budget ID." });
  const validated = readBudgetFields(request.body);
  if (validated.error) return response.status(400).json({ message: validated.error });
  const budget = await Budget.findOne({ _id: request.params.id, userId: request.user._id });
  if (!budget) return response.status(404).json({ message: "Budget not found." });
  Object.assign(budget, validated.value);
  await budget.save();
  return response.json({ budget: publicBudget(budget) });
});

router.delete("/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Invalid budget ID." });
  const budget = await Budget.findOneAndDelete({ _id: request.params.id, userId: request.user._id });
  if (!budget) return response.status(404).json({ message: "Budget not found." });
  return response.status(204).end();
});

module.exports = router;
