import { useEffect, useState } from "react";
import { api } from "../services/api";
import { formatMoney, todayLocal } from "../utils/format";

function daysBack(count) {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function AnalyticsPage() {
  const [range, setRange] = useState({ from: daysBack(29), to: todayLocal() });
  const [granularity, setGranularity] = useState("daily");
  const [report, setReport] = useState(null);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams(range);
    const year = new Date(`${range.to}T12:00:00`).getFullYear();
    Promise.all([
      api.get(`/analytics/summary?${query}`),
      api.get(`/analytics/category?${query}`),
      api.get(`/analytics/daily?${query}`),
      api.get(`/analytics/weekly?${query}`),
      api.get(`/analytics/monthly?year=${year}`),
      api.get("/analytics/insights"),
      api.get("/budgets"),
    ]).then(([summary, category, daily, weekly, monthly, insightData, budgetData]) => {
      if (active) setReport({ summary, category, daily: daily.days, weekly: weekly.weeks, monthly: monthly.months, insights: insightData.insights, budgets: budgetData.budgets });
    }).catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range, reload]);

  function applyRange(event) {
    event.preventDefault();
    if (range.from && range.to && range.from > range.to) { setError("The start date must be before the end date."); return; }
    setError("");
    setLoading(true);
    setReload((current) => current + 1);
  }

  const activeSeries = granularity === "weekly" ? report?.weekly || [] : report?.daily || [];
  const maxDaily = Math.max(1, ...activeSeries.map((period) => Math.max(period.income, period.expenses)));
  const maxMonthly = Math.max(1, ...(report?.monthly || []).map((month) => Math.max(month.income, month.expenses)));
  const maxCategory = Math.max(1, ...(report?.category.categories || []).map((category) => category.amount));

  return (
    <section className="analytics-page">
      <div className="page-heading"><div><p className="eyebrow">PATTERNS, NOT PRESSURE</p><h1>Analytics</h1><p className="page-description">Understand what your money is doing over time.</p></div></div>
      <form className="panel range-filter" onSubmit={applyRange}><div><p className="eyebrow">REPORTING WINDOW</p><strong>Choose a date range</strong></div><label className="field"><span>From</span><input type="date" value={range.from} onChange={(event) => setRange((value) => ({ ...value, from: event.target.value }))} /></label><label className="field"><span>To</span><input type="date" max={todayLocal()} value={range.to} onChange={(event) => setRange((value) => ({ ...value, to: event.target.value }))} /></label><button className="button button-dark">Update report</button></form>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {loading && !report ? <div className="panel loading-panel">Building your report…</div> : report && <>
        <div className="analytics-totals"><article><span>INCOME IN RANGE</span><strong className="income-text">{formatMoney(report.summary.totalIncome)}</strong></article><article><span>EXPENSES IN RANGE</span><strong className="expense-text">{formatMoney(report.summary.totalExpenses)}</strong></article><article><span>NET FLOW</span><strong>{formatMoney(report.summary.balance)}</strong></article><article><span>ENTRIES</span><strong>{report.summary.transactionCount}</strong></article></div>
        <div className="analytics-grid">
          <article className="panel chart-panel wide-chart"><div className="panel-heading"><div><p className="eyebrow">{granularity === "daily" ? "DAILY VIEW" : "WEEKLY VIEW"}</p><h2>Income & expenses</h2></div><div className="chart-tools"><div className="chart-switch" aria-label="Chart interval"><button type="button" className={granularity === "daily" ? "selected" : ""} onClick={() => setGranularity("daily")}>Daily</button><button type="button" className={granularity === "weekly" ? "selected" : ""} onClick={() => setGranularity("weekly")}>Weekly</button></div><div className="chart-legend"><span><i className="legend-income" />Income</span><span><i className="legend-expense" />Expenses</span></div></div></div>
            <div className="analytics-bar-chart">{activeSeries.map((period) => { const key = granularity === "daily" ? period.date : period.weekStart; const label = granularity === "daily" ? period.date.slice(8) : new Date(`${period.weekStart}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); return <div className="analytics-bar-day" key={key} title={`${key}: ${formatMoney(period.income)} income, ${formatMoney(period.expenses)} expenses`}><div className="analytics-pair"><span className="income-bar" style={{ height: `${Math.max(period.income ? 3 : 0, period.income / maxDaily * 100)}%` }} /><span className="expense-bar" style={{ height: `${Math.max(period.expenses ? 3 : 0, period.expenses / maxDaily * 100)}%` }} /></div><small>{label}</small></div>; })}</div>
          </article>
          <article className="panel category-panel"><div className="panel-heading"><div><p className="eyebrow">WHERE IT GOES</p><h2>Spending by category</h2></div></div>
            {report.category.categories.length ? <div className="category-bars">{report.category.categories.map((item, index) => <div className="category-bar-row" key={item.category}><div className="category-bar-label"><strong>{item.category}</strong><span>{formatMoney(item.amount)} <small>{item.percentage}%</small></span></div><div className="progress-track"><span className={`category-fill color-${index % 5}`} style={{ width: `${item.amount / maxCategory * 100}%` }} /></div></div>)}</div> : <p className="muted-copy">No expenses in this date range yet.</p>}
          </article>
          <article className="panel monthly-panel"><div className="panel-heading"><div><p className="eyebrow">YEAR AT A GLANCE</p><h2>Monthly flow</h2></div><div className="chart-legend"><span><i className="legend-income" />Income</span><span><i className="legend-expense" />Expenses</span></div></div>
            <div className="monthly-bars">{report.monthly.map((month) => <div className="monthly-bar-group" key={month.month} title={`${month.month}: ${formatMoney(month.income)} income, ${formatMoney(month.expenses)} expenses`}><div className="monthly-pair"><span className="income-bar" style={{ height: `${Math.max(month.income ? 3 : 0, month.income / maxMonthly * 100)}%` }} /><span className="expense-bar" style={{ height: `${Math.max(month.expenses ? 3 : 0, month.expenses / maxMonthly * 100)}%` }} /></div><small>{new Date(`${month.month}-01T12:00:00`).toLocaleDateString("en-IN", { month: "short" })}</small></div>)}</div>
          </article>
          <article className="panel insights-panel"><div className="panel-heading"><div><p className="eyebrow">SMALL SIGNALS</p><h2>Spending insights</h2></div><span className="insight-symbol">✳</span></div>
            {report.insights.length ? <div className="insight-list">{report.insights.map((insight) => <p className="insight-item" key={insight.id}><span className="insight-line" />{insight.message}</p>)}</div> : <p className="muted-copy">Insights will appear as you record more activity and set budgets.</p>}
          </article>
          {report.budgets.length > 0 && <article className="panel budget-analytics"><div className="panel-heading"><div><p className="eyebrow">MONTHLY LIMITS</p><h2>Budget usage</h2></div></div><div className="budget-mini-list">{report.budgets.map((budget) => <div className="budget-mini" key={budget.id}><div><strong>{budget.category}</strong><span>{formatMoney(budget.spent)} / {formatMoney(budget.amount)}</span></div><div className="progress-track"><span className={`budget-fill ${budget.percentageUsed >= 100 ? "over" : budget.percentageUsed >= 80 ? "near" : ""}`} style={{ width: `${Math.min(100, budget.percentageUsed)}%` }} /></div></div>)}</div></article>}
        </div>
      </>}
    </section>
  );
}
