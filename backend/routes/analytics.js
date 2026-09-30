const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { publicTransaction } = require("../utils/responses");
const { getCategoryAnalysis, getDailyAnalysis, getInsights, getMonthlyAnalysis, getSummary, getWeeklyAnalysis } = require("../services/analytics");

const router = Router();
router.use(requireAuth);

router.get("/summary", async (request, response) => {
  const summary = await getSummary(request.user, request.query);
  summary.recentTransactions = summary.recentTransactions.map(publicTransaction);
  return response.json(summary);
});

router.get("/category", async (request, response) => response.json(await getCategoryAnalysis(request.user, request.query)));
router.get("/daily", async (request, response) => response.json({ days: await getDailyAnalysis(request.user, request.query) }));
router.get("/weekly", async (request, response) => response.json({ weeks: await getWeeklyAnalysis(request.user, request.query) }));
router.get("/monthly", async (request, response) => response.json({ months: await getMonthlyAnalysis(request.user, request.query) }));
router.get("/insights", async (request, response) => response.json({ insights: await getInsights(request.user) }));

module.exports = router;
