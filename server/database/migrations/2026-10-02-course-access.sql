-- Acesso a cursos por utilizadores e grupos de utilizadores (mesmo modelo do eLearning).
-- Só entra em vigor nos cursos com course.settings.restrict_to_users = true; as tabelas novas não alteram nenhum dado existente.

-- Grupos de utilizadores (lista global, reutilizável em vários cursos)
CREATE TABLE IF NOT EXISTS `user_group` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `is_deleted` tinyint(4) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `modified_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Membros de um grupo (grupo ↔ utilizador)
CREATE TABLE IF NOT EXISTS `user_group_member` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_group` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_group_member` (`id_group`,`id_user`),
  KEY `idx_user_group_member_user` (`id_user`),
  CONSTRAINT `fk_user_group_member_group` FOREIGN KEY (`id_group`) REFERENCES `user_group` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_group_member_user` FOREIGN KEY (`id_user`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Utilizadores com acesso a um curso restrito (curso ↔ utilizador)
CREATE TABLE IF NOT EXISTS `course_user_access` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_course` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_course_user_access` (`id_course`,`id_user`),
  KEY `idx_course_user_access_user` (`id_user`),
  CONSTRAINT `fk_course_user_access_course` FOREIGN KEY (`id_course`) REFERENCES `course` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_course_user_access_user` FOREIGN KEY (`id_user`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Grupos com acesso a um curso restrito (curso ↔ grupo): têm acesso os membros do grupo
CREATE TABLE IF NOT EXISTS `course_group` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_course` int(11) NOT NULL,
  `id_group` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_course_group` (`id_course`,`id_group`),
  KEY `idx_course_group_group` (`id_group`),
  CONSTRAINT `fk_course_group_course` FOREIGN KEY (`id_course`) REFERENCES `course` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_course_group_group` FOREIGN KEY (`id_group`) REFERENCES `user_group` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
