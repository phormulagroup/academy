-- Permissões por função (papel) e secção do backoffice (mesmo modelo do eLearning).
-- O Admin (id_role = 1) tem sempre acesso total e nunca consulta esta tabela; sem linha para um (função, secção) não há
-- permissão nenhuma. Não altera nenhuma tabela nem dado existente.
CREATE TABLE IF NOT EXISTS `permission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_role` int(11) NOT NULL,
  `resource` varchar(100) NOT NULL,
  `can_create` tinyint(1) NOT NULL DEFAULT 0,
  `can_read` tinyint(1) NOT NULL DEFAULT 0,
  `can_update` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permission_role_resource` (`id_role`,`resource`),
  CONSTRAINT `fk_permission_role` FOREIGN KEY (`id_role`) REFERENCES `role` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
