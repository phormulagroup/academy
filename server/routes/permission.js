var express = require("express");
var util = require("util");
var router = express.Router();

var db = require("../utils/database");
const { RESOURCES, hasFullAccess, roleRows, denied, ADMIN_ROLE_ID, GESTOR_ROLE_ID, USER_ROLE_ID, MONITORING_RESOURCES } = require("../utils/permissions");

const query = util.promisify(db.query).bind(db);

router.get("/read", async (req, res) => {
  try {
    const requestedRole = parseInt(req.query.id_role);
    if (requestedRole !== req.user?.id_role && !hasFullAccess(req.user)) return res.status(403).send({ message: "You do not have permission for this action" });
    // Admin e Gestor veem as permissões de todas as funções (só o Admin as altera)
    res.send(await roleRows(requestedRole));
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") return res.send([]);
    console.error(err);
    res.status(500).send({ message: "Error" });
  }
});

// Substitui por completo as permissões de uma função pela lista enviada (só Admin). A função Admin não se edita.
router.post("/set", (req, res) => {
  const isAdmin = Number(req.user?.id_role) === ADMIN_ROLE_ID;
  const isGestor = Number(req.user?.id_role) === GESTOR_ROLE_ID;
  if (!isAdmin && !(isGestor && Number(req.body.data?.id_role) === USER_ROLE_ID)) return denied(res);
  db.getConnection(async (error, conn) => {
    if (error) return res.status(500).send({ message: "Error" });
    const q = util.promisify(conn.query).bind(conn);
    try {
      const { id_role, permissions } = req.body.data || {};
      if (!id_role || Number(id_role) === ADMIN_ROLE_ID) {
        conn.release();
        return res.status(400).send({ message: "The Admin role always has full access" });
      }
      await util.promisify(conn.beginTransaction).bind(conn)();
      // Gestor: as permissões do Sistema ficam as que estavam guardadas, seja o que for que venha no pedido
      const kept = isAdmin ? [] : (await q("SELECT * FROM permission WHERE id_role = ?", [id_role])).filter((p) => MONITORING_RESOURCES.includes(p.resource));
      const sent = (permissions || []).filter((p) => isAdmin || !MONITORING_RESOURCES.includes(p.resource));
      await q("DELETE FROM permission WHERE id_role = ?", [id_role]);
      const toInsert = [...sent, ...kept].filter((p) => RESOURCES.includes(p.resource) && (p.can_create || p.can_read || p.can_update || p.can_delete));
      if (toInsert.length > 0) {
        await q("INSERT INTO permission (id_role, resource, can_create, can_read, can_update, can_delete) VALUES ?", [
          toInsert.map((p) => [id_role, p.resource, p.can_create ? 1 : 0, p.can_read ? 1 : 0, p.can_update ? 1 : 0, p.can_delete ? 1 : 0]),
        ]);
      }
      await util.promisify(conn.commit).bind(conn)();
      conn.release();
      res.send({ id_role, permissions: toInsert });
    } catch (err) {
      console.error(err);
      await util.promisify(conn.rollback).bind(conn)();
      conn.release();
      res.status(500).send({ message: "Error" });
    }
  });
});

module.exports = router;
