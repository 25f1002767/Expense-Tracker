const MAX_TRANSACTION_PAISE = 10_000_000_000;

function toPaise(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;

  const [rupees, fraction = ""] = text.split(".");
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(paise) || paise <= 0 || paise > MAX_TRANSACTION_PAISE) return null;
  return paise;
}

function fromPaise(paise) {
  return paise / 100;
}

module.exports = { MAX_TRANSACTION_PAISE, fromPaise, toPaise };
