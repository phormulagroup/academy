-- Sessões terminadas pelo utilizador (logout efetivo): o token continuava válido até ao fim das 12 h mesmo depois de a pessoa terminar a sessão, por isso
-- quem tivesse uma cópia dele (um computador partilhado, um cookie copiado) continuava a entrar. Cada sessão tem um identificador (jti) e, ao terminar,
-- fica aqui até ao instante em que o token expiraria (depois disso já não vale por si, e a linha apaga-se).
-- Aditivo: só cria uma tabela. Sem ela, a API guarda as sessões terminadas em memória (valem até ao próximo reinício).
CREATE TABLE IF NOT EXISTS `revoked_session` (
  `jti` varchar(80) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`jti`),
  KEY `idx_revoked_session_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
