const mongoose = require("mongoose");
const { EXPENSE_CATEGORIES, INCOME_CATEGORIES } = require("../utils/categories");
const { MAX_TRANSACTION_PAISE } = require("../utils/money");

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["Income", "Expense"], required: true },
    amountPaise: { type: Number, required: true, min: 1, max: MAX_TRANSACTION_PAISE, validate: Number.isSafeInteger },
    category: {
      type: String,
      required: true,
      validate: {
        validator(category) {
          return (this.type === "Income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).includes(category);
        },
        message: "Choose a category that matches the transaction type.",
      },
    },
    description: { type: String, trim: true, maxlength: 240, default: "" },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });

module.exports = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
