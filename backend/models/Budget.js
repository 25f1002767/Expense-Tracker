const mongoose = require("mongoose");
const { EXPENSE_CATEGORIES } = require("../utils/categories");
const { MAX_TRANSACTION_PAISE } = require("../utils/money");

const budgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: true, enum: EXPENSE_CATEGORIES },
    amountPaise: { type: Number, required: true, min: 1, max: MAX_TRANSACTION_PAISE, validate: Number.isSafeInteger },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true, min: 2000, max: 2200 },
  },
  { timestamps: true }
);

budgetSchema.index({ userId: 1, year: 1, month: 1, category: 1 }, { unique: true });

module.exports = mongoose.models.Budget || mongoose.model("Budget", budgetSchema);
