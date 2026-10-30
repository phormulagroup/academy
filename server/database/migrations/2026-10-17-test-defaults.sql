-- Todos os testes passam a ter 45 minutos, 75% de percentagem mínima de aprovação e as tentativas do idioma do curso: 1 em português e
-- francês (não se pode repetir) e 2 em espanhol e inglês (faz-se uma vez e pode repetir-se uma). Os testes novos já nascem assim (ver
-- utils/testDefaults.js). `retries_allowed` conta as tentativas no total.
-- Só toca nas definições dos testes (course_test.settings) e guarda antes uma cópia dos valores antigos em `course_test_settings_backup`
-- (para voltar atrás: UPDATE course_test t JOIN course_test_settings_backup b ON b.id = t.id SET t.settings = b.settings).
-- Repetível: a cópia só guarda os valores de antes da primeira vez, e os valores aplicados são sempre os mesmos.

CREATE TABLE IF NOT EXISTS `course_test_settings_backup` (
  `id` int(11) NOT NULL,
  `settings` longtext DEFAULT NULL,
  `backed_up_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `course_test_settings_backup` (`id`, `settings`) SELECT `id`, `settings` FROM `course_test`;

-- Duração e percentagem mínima: todos os testes (as definições que não forem JSON válido ficam como estão)
UPDATE `course_test`
SET `settings` = JSON_SET(COALESCE(NULLIF(`settings`, ''), '{}'), '$.time', 45, '$.passing_score', 75)
WHERE JSON_VALID(COALESCE(NULLIF(`settings`, ''), '{}'));

-- Tentativas, pelo idioma do curso do teste
UPDATE `course_test` t
JOIN `course_module` m ON m.`id` = t.`id_course_module`
JOIN `course` c ON c.`id` = m.`id_course`
JOIN `language` l ON l.`id` = c.`id_lang`
SET t.`settings` = JSON_SET(COALESCE(NULLIF(t.`settings`, ''), '{}'), '$.retries_allowed', CASE WHEN l.`code` IN ('pt', 'fr') THEN 1 ELSE 2 END)
WHERE l.`code` IN ('pt', 'fr', 'es', 'en') AND JSON_VALID(COALESCE(NULLIF(t.`settings`, ''), '{}'));
