require("./helpers/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const { installFakeDb } = require("./helpers/fakeDb");

const updates = [];
installFakeDb((sql, params) => {
  if (/^UPDATE notification_user SET is_read = 1 WHERE id_user/.test(sql)) {
    updates.push(params);
    return { affectedRows: 3 };
  }
  return [];
});
const express = require("express");
const { patchAsyncHandlers, errorHandler } = require("../utils/asyncErrors");
patchAsyncHandlers();

const app = express();
app.use(express.json());
// A sessão (utils/middleware.js) é testada à parte: aqui a pessoa já vem identificada
app.use((req, res, next) => {
  req.user = { id: 11, id_role: 3 };
  next();
});
app.use("/notification", require("../routes/notification"));
app.use(errorHandler);

let server;
test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
});
test.after(() => server.close());

test("markAllAsRead marca só as notificações de quem faz o pedido", async () => {
  const res = await fetch(`http://127.0.0.1:${server.address().port}/notification/markAllAsRead`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: { id_user: 999 } }) });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { updated: 3 });
  // Mesmo que o pedido leve outro id_user, vale sempre o da sessão
  assert.deepEqual(updates.at(-1), [11]);
});
