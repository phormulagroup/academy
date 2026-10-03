-- Comunicações: e-mails enviados pela plataforma a um público escolhido (utilizadores, grupos, cursos, país, idioma, função).
-- Aditivo: só cria duas tabelas novas. Não altera nenhum dado existente.

CREATE TABLE IF NOT EXISTS `communication` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL DEFAULT '',
  `design` longtext DEFAULT NULL,
  `html` longtext DEFAULT NULL,
  `audience` longtext DEFAULT NULL,
  `status` enum('draft','scheduled','sending','sent','failed','cancelled') NOT NULL DEFAULT 'draft',
  `scheduled_at` datetime DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `finished_at` datetime DEFAULT NULL,
  `total` int(11) NOT NULL DEFAULT 0,
  `error_message` varchar(500) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `modified_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_communication_status` (`status`, `scheduled_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Uma linha por destinatário, criada quando o envio começa (o público fica "fotografado" nesse momento)
CREATE TABLE IF NOT EXISTS `communication_recipient` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `id_communication` int(11) NOT NULL,
  `id_user` int(11) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `status` enum('pending','sent','error','cancelled') NOT NULL DEFAULT 'pending',
  `error_message` varchar(500) DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_comm_recipient_status` (`id_communication`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
