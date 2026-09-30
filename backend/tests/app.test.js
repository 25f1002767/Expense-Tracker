const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { app } = require("../server");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("health endpoint reports API and database state", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", database: "disconnected" });
});

test("private transaction and budget routes reject missing sessions", async () => {
  const transactions = await fetch(`${baseUrl}/api/transactions`);
  const budgets = await fetch(`${baseUrl}/api/budgets`);
  assert.equal(transactions.status, 401);
  assert.equal(budgets.status, 401);
});

test("registration rejects missing required fields", async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /name/i);
});

test("registration rejects invalid email, weak password, and invalid time zone", async () => {
  const cases = [
    { body: { name: "A User", email: "invalid", password: "long-enough-password" }, expected: /email/i },
    { body: { name: "A User", email: "person@example.com", password: "short" }, expected: /password/i },
    { body: { name: "A User", email: "person@example.com", password: "long-enough-password", timeZone: "Mars/Olympus" }, expected: /time zone/i },
  ];
  for (const item of cases) {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item.body),
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).message, item.expected);
  }
});
