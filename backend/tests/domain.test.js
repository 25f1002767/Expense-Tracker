const assert = require("node:assert/strict");
const { test } = require("node:test");
const mongoose = require("mongoose");
const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const { localDateKey, localDateTimeToUtc } = require("../utils/dates");
const { fromPaise, toPaise } = require("../utils/money");
const { publicBudget } = require("../utils/responses");

test("money conversion uses exact integer paise", () => {
  assert.equal(toPaise("500.25"), 50025);
  assert.equal(toPaise(12), 1200);
  assert.equal(fromPaise(50025), 500.25);
  assert.equal(toPaise("0"), null);
  assert.equal(toPaise("-2"), null);
  assert.equal(toPaise("1.999"), null);
  assert.equal(toPaise("100000001"), null);
});

test("local transaction date is converted using its timezone", () => {
  const instant = localDateTimeToUtc("2026-09-30", "12:34", "Asia/Kolkata");
  assert.equal(instant.toISOString(), "2026-09-30T07:04:00.000Z");
  assert.equal(localDateKey(instant, "Asia/Kolkata"), "2026-09-30");
  assert.equal(localDateTimeToUtc("2026-02-30", "12:00", "Asia/Kolkata"), null);
  assert.equal(localDateTimeToUtc("2026-03-08", "02:30", "America/New_York"), null);
});

test("transaction model enforces type-specific categories", async () => {
  const userId = new mongoose.Types.ObjectId();
  const valid = new Transaction({ userId, type: "Income", amountPaise: 10000, category: "Salary", date: new Date() });
  await valid.validate();

  const invalid = new Transaction({ userId, type: "Expense", amountPaise: 10000, category: "Salary", date: new Date() });
  await assert.rejects(invalid.validate(), { name: "ValidationError" });
});

test("budget model rejects income-only categories and invalid months", async () => {
  const invalidCategory = new Budget({ userId: new mongoose.Types.ObjectId(), category: "Salary", amountPaise: 10000, month: 1, year: 2026 });
  await assert.rejects(invalidCategory.validate(), { name: "ValidationError" });

  const invalidMonth = new Budget({ userId: new mongoose.Types.ObjectId(), category: "Food", amountPaise: 10000, month: 13, year: 2026 });
  await assert.rejects(invalidMonth.validate(), { name: "ValidationError" });
});

test("budget response reports negative remaining amount after overspending", () => {
  const budget = { _id: new mongoose.Types.ObjectId(), category: "Food", month: 9, year: 2026, amountPaise: 10000 };
  const result = publicBudget(budget, 12500);
  assert.equal(result.spent, 125);
  assert.equal(result.remaining, -25);
  assert.equal(result.percentageUsed, 125);
});
