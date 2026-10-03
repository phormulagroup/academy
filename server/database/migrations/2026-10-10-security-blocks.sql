-- Bloqueios por tentativas excessivas (login, código de recuperação, pedidos de código): ficam na base de dados para o Admin os
-- poder ver e desbloquear em Monitorização > Bloqueios, e para valerem em todos os processos da API e depois de reiniciar.
-- Sem esta tabela a API usa um limite em memória (funciona, mas não se vê nem se desbloqueia). Aditivo: só cria uma tabela nova.
CREATE TABLE IF NOT EXISTS `security_block` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `scope` varchar(30) NOT NULL,
  `kind` enum('email','ip') NOT NULL DEFAULT 'email',
  `identifier` varchar(255) NOT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `attempts` int(11) NOT NULL DEFAULT 0,
  `window_ends` datetime NOT NULL,
  `blocked_until` datetime DEFAULT NULL,
  `last_attempt_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_security_block` (`scope`, `kind`, `identifier`),
  KEY `idx_security_block_blocked` (`blocked_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
