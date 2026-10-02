-- Tickets de suporte (substituem a caixa de entrada: thread / thread_message).
-- Aditivo: cria `ticket` e `ticket_message` e copia as conversas antigas, uma única vez (só se `ticket` estiver vazia).
-- As tabelas antigas (`thread`, `thread_message`) ficam intactas.
CREATE TABLE IF NOT EXISTS `ticket` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_user` int(11) NOT NULL,
  `subject` varchar(500) NOT NULL,
  `status` enum('aberto','fechado') NOT NULL DEFAULT 'aberto',
  `priority` enum('baixa','normal','alta','urgente') NOT NULL DEFAULT 'normal',
  `id_assignee` int(11) DEFAULT NULL,
  `last_message_at` datetime NOT NULL DEFAULT current_timestamp(),
  `last_member_read_at` datetime DEFAULT NULL,
  `last_admin_read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `modified_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_ticket_user` (`id_user`),
  KEY `fk_ticket_assignee` (`id_assignee`),
  CONSTRAINT `fk_ticket_user` FOREIGN KEY (`id_user`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ticket_assignee` FOREIGN KEY (`id_assignee`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ticket_message` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_ticket` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `attachment` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_tm_ticket` (`id_ticket`),
  KEY `fk_tm_user` (`id_user`),
  CONSTRAINT `fk_tm_ticket` FOREIGN KEY (`id_ticket`) REFERENCES `ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_tm_user` FOREIGN KEY (`id_user`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
