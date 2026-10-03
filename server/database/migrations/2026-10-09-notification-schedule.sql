-- Notificações agendadas: quando devem sair (scheduled_at) e quando saíram (sent_at). Uma notificação sem sent_at ainda não foi enviada;
-- com scheduled_at no futuro está agendada. As que já tinham destinatários ficam marcadas como enviadas (data do primeiro envio).
-- Aditivo: só acrescenta duas colunas; correr uma vez (se já existirem, o MySQL avisa e nada se perde).
ALTER TABLE `notification`
  ADD COLUMN `scheduled_at` datetime DEFAULT NULL AFTER `meta_data`,
  ADD COLUMN `sent_at` datetime DEFAULT NULL AFTER `scheduled_at`;

UPDATE `notification` n
  JOIN (SELECT id_notification, MIN(created_at) AS first_sent FROM notification_user GROUP BY id_notification) nu ON nu.id_notification = n.id
  SET n.sent_at = nu.first_sent
  WHERE n.sent_at IS NULL;
