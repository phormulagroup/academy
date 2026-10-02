-- Copia as conversas da caixa de entrada antiga para tickets (corre uma só vez: ignora-se se já houver tickets).
-- Ficam todas como lidas. O ID do ticket é o ID da conversa antiga.
INSERT INTO ticket (id, id_user, subject, status, id_assignee, last_message_at, last_member_read_at, last_admin_read_at, created_at)
SELECT t.id, t.id_user, t.title, IF(t.status = 'closed', 'fechado', 'aberto'), t.id_user_responsible,
       COALESCE((SELECT MAX(m.created_at) FROM thread_message m WHERE m.id_thread = t.id AND m.is_deleted = 0), t.created_at),
       NOW(), NOW(), t.created_at
FROM thread t
WHERE NOT EXISTS (SELECT 1 FROM ticket)
  AND EXISTS (SELECT 1 FROM user u WHERE u.id = t.id_user)
  AND (t.id_user_responsible IS NULL OR EXISTS (SELECT 1 FROM user r WHERE r.id = t.id_user_responsible));

INSERT INTO ticket_message (id_ticket, id_user, message, created_at)
SELECT m.id_thread, m.from_id_user, m.text, m.created_at
FROM thread_message m
WHERE m.is_deleted = 0
  AND EXISTS (SELECT 1 FROM ticket k WHERE k.id = m.id_thread)
  AND EXISTS (SELECT 1 FROM user u WHERE u.id = m.from_id_user)
  AND NOT EXISTS (SELECT 1 FROM ticket_message)
ORDER BY m.created_at, m.id;
