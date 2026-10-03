-- Biblioteca do editor de e-mails, partilhada pela equipa: blocos guardados (um pedaço de e-mail, em MJML) e modelos guardados
-- (um e-mail completo). Aditivo: só cria uma tabela nova.
CREATE TABLE IF NOT EXISTS `email_library` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `kind` enum('block','template') NOT NULL,
  `name` varchar(255) NOT NULL,
  -- bloco: o MJML do bloco; modelo: o projeto do editor (JSON)
  `content` longtext NOT NULL,
  -- modelo: o HTML compilado, para a pré-visualização na galeria
  `html` longtext DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `modified_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_email_library_kind` (`kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
