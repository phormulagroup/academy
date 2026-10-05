-- Índices das tabelas principais (pesquisas, filtros, ordenações e contagens das listagens e do Painel). Antes só tinham a chave primária,
-- por isso cada consulta lia a tabela inteira; com o crescimento dos dados isso torna-se lento.
-- Aditivo e repetível: cada índice só se cria se ainda não existir (funciona em MySQL e MariaDB). Não altera dados.

SET @sql = (SELECT IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'logs' AND index_name = 'idx_logs_lang_created')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'logs'),
  'SELECT 1', 'CREATE INDEX `idx_logs_lang_created` ON `logs` (id_lang, created_at)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'logs' AND index_name = 'idx_logs_user')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'logs'),
  'SELECT 1', 'CREATE INDEX `idx_logs_user` ON `logs` (id_user)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'course_user_activity' AND index_name = 'idx_cua_user_course')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'course_user_activity'),
  'SELECT 1', 'CREATE INDEX `idx_cua_user_course` ON `course_user_activity` (id_user, id_course)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'course_user_activity' AND index_name = 'idx_cua_course_type')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'course_user_activity'),
  'SELECT 1', 'CREATE INDEX `idx_cua_course_type` ON `course_user_activity` (id_course, activity_type, is_completed)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'course_user_activity' AND index_name = 'idx_cua_created')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'course_user_activity'),
  'SELECT 1', 'CREATE INDEX `idx_cua_created` ON `course_user_activity` (created_at)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'user' AND index_name = 'idx_user_lang_deleted')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'user'),
  'SELECT 1', 'CREATE INDEX `idx_user_lang_deleted` ON `user` (id_lang, is_deleted)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'user' AND index_name = 'idx_user_email')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'user'),
  'SELECT 1', 'CREATE INDEX `idx_user_email` ON `user` (email)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'user' AND index_name = 'idx_user_role')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'user'),
  'SELECT 1', 'CREATE INDEX `idx_user_role` ON `user` (id_role)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'course' AND index_name = 'idx_course_lang_deleted')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'course'),
  'SELECT 1', 'CREATE INDEX `idx_course_lang_deleted` ON `course` (id_lang, is_deleted)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'course' AND index_name = 'idx_course_slug')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'course'),
  'SELECT 1', 'CREATE INDEX `idx_course_slug` ON `course` (slug)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'course_module' AND index_name = 'idx_course_module_course')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'course_module'),
  'SELECT 1', 'CREATE INDEX `idx_course_module_course` ON `course_module` (id_course, is_deleted)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'course_topic' AND index_name = 'idx_course_topic_module')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'course_topic'),
  'SELECT 1', 'CREATE INDEX `idx_course_topic_module` ON `course_topic` (id_course_module, is_deleted)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'course_test' AND index_name = 'idx_course_test_module')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'course_test'),
  'SELECT 1', 'CREATE INDEX `idx_course_test_module` ON `course_test` (id_course_module, is_deleted)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'notification' AND index_name = 'idx_notification_lang')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'notification'),
  'SELECT 1', 'CREATE INDEX `idx_notification_lang` ON `notification` (id_lang)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'notification_user' AND index_name = 'idx_notification_user_user')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'notification_user'),
  'SELECT 1', 'CREATE INDEX `idx_notification_user_user` ON `notification_user` (id_user, is_read)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'notification_user' AND index_name = 'idx_notification_user_notification')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'notification_user'),
  'SELECT 1', 'CREATE INDEX `idx_notification_user_notification` ON `notification_user` (id_notification)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'form_submission' AND index_name = 'idx_form_submission_lang')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'form_submission'),
  'SELECT 1', 'CREATE INDEX `idx_form_submission_lang` ON `form_submission` (id_lang, is_deleted, created_at)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'form_submission' AND index_name = 'idx_form_submission_email')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'form_submission'),
  'SELECT 1', 'CREATE INDEX `idx_form_submission_email` ON `form_submission` (email, created_at)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
