const util = require("util");
const db = require("./database");

const query = util.promisify(db.query).bind(db);

// Limite de tentativas falhadas (login, código de recuperação...): depois de `max` falhas dentro da janela, bloqueia até a janela acabar.
// Os bloqueios ficam na tabela security_block (migração 2026-10-10), por isso o Admin vê e desbloqueia em Monitorização > Bloqueios e valem
// para todos os processos. Sem a tabela usa a memória (o limite funciona, só não se vê nem se desbloqueia).
//
// Bloqueia por e-mail e, com TRUST_PROXY definido (só aí o IP é o da pessoa e não o do proxy), também por IP (3x o limite do e-mail).

let tableOk = false;
let checkedAt = 0;
async function tableReady() {
  if (tableOk) return true;
  if (Date.now() - checkedAt < 30 * 1000) return false;
  checkedAt = Date.now();
  try {
    tableOk = (await query("SHOW TABLES LIKE 'security_block'")).length > 0;
  } catch {
    tableOk = false;
  }
  return tableOk;
}

const ipBlocking = () => !!process.env.TRUST_PROXY;
const memory = new Map(); // fallback: "scope|kind|identifier" → { count, resetAt }

function createThrottle({ scope, windowMs, max }) {
  const seconds = Math.round(windowMs / 1000);
  const targets = (identifier, ip) => {
    const list = [{ kind: "email", identifier: String(identifier || ""), limit: max }];
    if (ip && ipBlocking()) list.push({ kind: "ip", identifier: ip, limit: max * 3 });
    return list;
  };

  async function blockedOne(t) {
    if (await tableReady()) {
      const rows = await query("SELECT 1 FROM security_block WHERE scope = ? AND kind = ? AND identifier = ? AND blocked_until > NOW() LIMIT 1", [scope, t.kind, t.identifier]);
      return rows.length > 0;
    }
    const entry = memory.get(`${scope}|${t.kind}|${t.identifier}`);
    return !!entry && entry.resetAt > Date.now() && entry.count >= t.limit;
  }

  async function failOne(t, ip) {
    if (await tableReady()) {
      // As atribuições do ON DUPLICATE KEY UPDATE correm por ordem: attempts vê a janela antiga, blocked_until vê as novas
      await query(
        `INSERT INTO security_block (scope, kind, identifier, ip, attempts, window_ends, blocked_until, last_attempt_at)
         VALUES (?, ?, ?, ?, 1, NOW() + INTERVAL ? SECOND, IF(1 >= ?, NOW() + INTERVAL ? SECOND, NULL), NOW())
         ON DUPLICATE KEY UPDATE
           attempts = IF(window_ends < NOW(), 1, attempts + 1),
           window_ends = IF(window_ends < NOW(), NOW() + INTERVAL ? SECOND, window_ends),
           ip = VALUES(ip),
           last_attempt_at = NOW(),
           blocked_until = IF(attempts >= ?, window_ends, NULL)`,
        [scope, t.kind, t.identifier, ip || null, seconds, t.limit, seconds, seconds, t.limit],
      );
      const [row] = await query("SELECT attempts FROM security_block WHERE scope = ? AND kind = ? AND identifier = ?", [scope, t.kind, t.identifier]);
      return row?.attempts ?? 1;
    }
    const key = `${scope}|${t.kind}|${t.identifier}`;
    const entry = memory.get(key);
    const fresh = entry && entry.resetAt > Date.now() ? entry : { count: 0, resetAt: Date.now() + windowMs };
    fresh.count++;
    memory.set(key, fresh);
    return fresh.count;
  }

  return {
    // Já esgotou as tentativas (o e-mail ou, havendo, o IP)?
    async blocked(identifier, ip) {
      for (const t of targets(identifier, ip)) if (await blockedOne(t)) return true;
      return false;
    },
    // Regista uma tentativa falhada; devolve as falhas do e-mail na janela
    async fail(identifier, ip) {
      let count = 0;
      for (const t of targets(identifier, ip)) {
        const n = await failOne(t, ip);
        if (t.kind === "email") count = n;
      }
      return count;
    },
    // Sucesso: limpa o contador do e-mail (o do IP corre até a janela acabar)
    async reset(identifier) {
      const id = String(identifier || "");
      if (await tableReady()) await query("DELETE FROM security_block WHERE scope = ? AND kind = 'email' AND identifier = ?", [scope, id]);
      else memory.delete(`${scope}|email|${id}`);
    },
  };
}

module.exports = { createThrottle, tableReady };
