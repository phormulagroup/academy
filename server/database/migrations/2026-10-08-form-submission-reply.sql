-- Respostas às submissões do formulário de contacto, enviadas pela plataforma: guarda o que foi respondido, por quem, quando e se o
-- e-mail saiu (com a razão se falhou). Uma submissão com uma resposta enviada conta como "respondida". Aditivo: só cria uma tabela nova.
CREATE TABLE IF NOT EXISTS `form_submission_reply` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_submission` int(11) NOT NULL,
  `id_user` int(11) DEFAULT NULL,
  `to_email` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL DEFAULT '',
  `message` mediumtext NOT NULL,
  `status` enum('sent','error') NOT NULL,
  `error_message` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `modified_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_form_reply_submission` (`id_submission`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
