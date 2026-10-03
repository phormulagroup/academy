-- Estatísticas das comunicações: cliques por destinatário (as aberturas não se medem: não são um valor fiável). Aditivo: só acrescenta colunas e uma tabela nova.
-- (Correr uma única vez: o MySQL/MariaDB não repete um ADD COLUMN.)

ALTER TABLE `communication`
  ADD COLUMN `track` tinyint(1) NOT NULL DEFAULT 1 AFTER `audience`,
  ADD COLUMN `track_base` varchar(255) DEFAULT NULL AFTER `track`;

ALTER TABLE `communication_recipient`
  ADD COLUMN `token` varchar(40) DEFAULT NULL,
  ADD COLUMN `clicked_at` datetime DEFAULT NULL,
  ADD COLUMN `click_count` int(11) NOT NULL DEFAULT 0,
  ADD UNIQUE KEY `uq_comm_recipient_token` (`token`);

-- Cada clique num link (para saber quais os links mais clicados)
CREATE TABLE IF NOT EXISTS `communication_click` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `id_communication` int(11) NOT NULL,
  `id_recipient` bigint(20) NOT NULL,
  `url` varchar(1000) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_comm_click` (`id_communication`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
