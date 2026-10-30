-- Posição de cada vídeo de um tópico, por aluno: a app grava-a a cada 30 s durante a reprodução para retomar o vídeo onde ficou
-- (depois de recarregar a página, perder a ligação ou voltar noutro dia), sem poluir o histórico de atividade. Um tópico pode ter mais
-- do que um vídeo: `video_id` é o ID do Vimeo (extraído do src do iframe), estável mesmo que o conteúdo seja reordenado.
-- Aditivo: só cria uma tabela nova. Sem ela a app funciona na mesma, só não retoma os vídeos.
CREATE TABLE IF NOT EXISTS `course_video_progress` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_user` int(11) NOT NULL,
  `id_course_topic` int(11) NOT NULL,
  `video_id` varchar(50) NOT NULL DEFAULT '',
  `time_watched` int(11) NOT NULL DEFAULT 0,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_video_progress_user_topic_video` (`id_user`, `id_course_topic`, `video_id`),
  KEY `idx_video_progress_topic` (`id_course_topic`),
  CONSTRAINT `fk_video_progress_user` FOREIGN KEY (`id_user`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_video_progress_topic` FOREIGN KEY (`id_course_topic`) REFERENCES `course_topic` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
