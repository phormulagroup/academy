-- Opções do texto do certificado (as mesmas do eLearning):
--  text_align: alinhamento do texto (left / center / right); os certificados existentes ficam à esquerda.
--  text_x / text_y: posição do centro do bloco de texto, em % da página (0–100); NULL = automática.
-- Enquanto estas colunas não existirem, o backoffice mostra os controlos desativados e não os guarda.
ALTER TABLE `course_certificate`
  ADD COLUMN `text_align` varchar(10) NOT NULL DEFAULT 'left' AFTER `text`,
  ADD COLUMN `text_x` tinyint(3) unsigned DEFAULT NULL AFTER `text_align`,
  ADD COLUMN `text_y` tinyint(3) unsigned DEFAULT NULL AFTER `text_x`;
