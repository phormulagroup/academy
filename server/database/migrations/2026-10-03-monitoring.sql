-- Monitorização da plataforma: registo de erros do servidor, registo de e-mails enviados e disponibilidade (tempo em baixo).
-- Aditivo: só cria tabelas novas e a função "Gestor" (se ainda não existir). Não altera nenhum dado existente.

CREATE TABLE IF NOT EXISTS `server_log` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `level` enum('error','warning') NOT NULL DEFAULT 'error',
  `source` varchar(50) NOT NULL,
  `message` text NOT NULL,
  `stack` mediumtext DEFAULT NULL,
  `method` varchar(10) DEFAULT NULL,
  `url` varchar(500) DEFAULT NULL,
  `status_code` int(11) DEFAULT NULL,
  `id_user` int(11) DEFAULT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `is_resolved` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_server_log_created` (`created_at`),
  KEY `idx_server_log_level` (`level`, `is_resolved`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `email_log` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `to_email` varchar(255) DEFAULT NULL,
  `subject` varchar(500) DEFAULT NULL,
  `template` varchar(100) DEFAULT NULL,
  `status` enum('sent','error') NOT NULL,
  `error_message` text DEFAULT NULL,
  `error_code` varchar(100) DEFAULT NULL,
  `message_id` varchar(255) DEFAULT NULL,
  `smtp_response` varchar(500) DEFAULT NULL,
  `duration_ms` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_email_log_created` (`created_at`),
  KEY `idx_email_log_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Última vez que o servidor esteve vivo (1 linha, atualizada de 30 em 30 segundos): ao arrancar, a diferença para agora é o tempo em baixo
CREATE TABLE IF NOT EXISTS `server_heartbeat` (
  `id` int(11) NOT NULL,
  `last_seen` datetime NOT NULL,
  `started_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `downtime` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `started_at` datetime NOT NULL,
  `ended_at` datetime NOT NULL,
  `duration_seconds` int(11) NOT NULL,
  `reason` varchar(50) NOT NULL DEFAULT 'server_down',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_downtime_started` (`started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Funções da plataforma: Admin, Gestor e Utilizador (as permissões do Gestor definem-se em Permissões)
INSERT INTO `role` (`name`) SELECT 'Gestor' WHERE NOT EXISTS (SELECT 1 FROM `role` WHERE `name` = 'Gestor');
