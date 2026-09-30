const { Router } = require("express");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const { EXPENSE_CATEGORIES, INCOME_CATEGORIES } = require("../utils/categories");
const { localDateAtEndOfDay, localDateAtMidnight, parseTransactionDate } = require("../utils/dates");
const { fromPaise, toPaise } = require("../utils/money");
const { publicTransaction } = require("../utils/responses");
const { requireAuth } = require("../middleware/auth");

const router = Router();
router.use(requireAuth);
const sortOptions = { newest: { date: -1, _id: -1 }, oldest: { date: 1, _id: 1 }, amountDesc: { amountPaise: -1, _id: -1 }, amountAsc: { amountPaise: 1, _id: 1 } };
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function validateTransaction(body, timeZone) {
  const { type, category, description = "", date, time } = body;
  if (!["Income", "Expense"].includes(type)) return { error: "Select Income or Expense." };
  const categories = type === "Income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if (typeof category !== "string" || !categories.includes(category)) return { error: "Choose a valid category." };
  if (typeof description !== "string" || description.trim().length > 240) return { error: "Description must be 240 characters or fewer." };
  const amountPaise = toPaise(body.amount);
  if (!amountPaise) return { error: "Amount must be greater than 0, with up to two decimal places, and within the allowed limit." };
  const parsedDate = parseTransactionDate(date, time, timeZone);
  if (!parsedDate) return { error: "Enter a valid date and time." };
  if (parsedDate > new Date()) return { error: "Transaction date cannot be in the future." };
  return { value: { type, amountPaise, category, description: description.trim(), date: parsedDate } };
}

function dateFilter(request, response, next) {
  const { from, to, date } = request.query;
  const timeZone = request.user.timeZone;
  let start;
  let end;
  if (date) {
    start = localDateAtMidnight(String(date), timeZone);
    end = localDateAtEndOfDay(String(date), timeZone);
  } else {
    start = from ? localDateAtMidnight(String(from), timeZone) : null;
    end = to ? localDateAtEndOfDay(String(to), timeZone) : null;
  }
  if ((date && (!start || !end)) || (from && !start) || (to && !end) || (start && end && start > end)) {
    return response.status(400).json({ message: "Enter a valid date range." });
  }
  request.dateRange = { start, end };
  return next();
}

router.post("/", async (request, response) => {
  const validated = validateTransaction(request.body, request.user.timeZone);
  if (validated.error) return response.status(400).json({ message: validated.error });
  const transaction = await Transaction.create({ ...validated.value, userId: request.user._id });
  return response.status(201).json({ transaction: publicTransaction(transaction) });
});

router.get("/", dateFilter, async (request, response) => {
  const page = Number.parseInt(request.query.page, 10) || 1;
  const limit = Math.min(Number.parseInt(request.query.limit, 10) || 20, 100);
  if (page < 1 || limit < 1) return response.status(400).json({ message: "Page and limit must be positive numbers." });

  const filter = { userId: request.user._id };
  if (request.query.type) {
    if (!["Income", "Expense"].includes(request.query.type)) return response.status(400).json({ message: "Invalid transaction type." });
    filter.type = request.query.type;
  }
  if (request.query.category) {
    const allowed = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
    if (!allowed.includes(request.query.category)) return response.status(400).json({ message: "Invalid category." });
    filter.category = request.query.category;
  }
  if (request.query.search) filter.description = { $regex: escapeRegex(String(request.query.search).slice(0, 100)), $options: "i" };
  const range = {};
  if (request.dateRange.start) range.$gte = request.dateRange.start;
  if (request.dateRange.end) range.$lte = request.dateRange.end;
  if (Object.keys(range).length) filter.date = range;

  if (request.query.sort && !sortOptions[request.query.sort]) return response.status(400).json({ message: "Invalid sort option." });
  const sort = sortOptions[request.query.sort] || sortOptions.newest;
  const [transactions, total] = await Promise.all([
    Transaction.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    Transaction.countDocuments(filter),
  ]);
  return response.json({ transactions: transactions.map(publicTransaction), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

router.get("/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Invalid transaction ID." });
  const transaction = await Transaction.findOne({ _id: request.params.id, userId: request.user._id });
  if (!transaction) return response.status(404).json({ message: "Transaction not found." });
  return response.json({ transaction: publicTransaction(transaction) });
});

router.put("/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Invalid transaction ID." });
  const validated = validateTransaction(request.body, request.user.timeZone);
  if (validated.error) return response.status(400).json({ message: validated.error });
  const transaction = await Transaction.findOne({ _id: request.params.id, userId: request.user._id });
  if (!transaction) return response.status(404).json({ message: "Transaction not found." });
  Object.assign(transaction, validated.value);
  await transaction.save();
  return response.json({ transaction: publicTransaction(transaction) });
});

router.delete("/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Invalid transaction ID." });
  const transaction = await Transaction.findOneAndDelete({ _id: request.params.id, userId: request.user._id });
  if (!transaction) return response.status(404).json({ message: "Transaction not found." });
  return response.status(204).end();
});

module.exports = router;
