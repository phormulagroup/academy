-- Registo de atividade (CRUD): quem criou, editou ou apagou o quê, e quando, em cada secção do backoffice. Serve para o cliente e a equipa
-- perceberem o que foi mexido (Monitorização > Atividade). Guarda os campos alterados (antes e depois), sem passwords nem tokens.
-- Sem esta tabela a API funciona na mesma, só não regista. Aditivo: só cria uma tabela nova.
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `id_user` int(11) DEFAULT NULL,
  `resource` varchar(40) NOT NULL,
  `action` varchar(40) NOT NULL,
  `record_id` varchar(40) DEFAULT NULL,
  `label` varchar(255) DEFAULT NULL,
  `changes` mediumtext DEFAULT NULL,
  `route` varchar(120) NOT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_created` (`created_at`),
  KEY `idx_audit_user` (`id_user`, `created_at`),
  KEY `idx_audit_resource` (`resource`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
