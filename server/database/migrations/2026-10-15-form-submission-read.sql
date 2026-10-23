-- Estado lido / por ler das submissões do formulário de contacto (Respostas): o número no menu do backoffice passa a contar só as
-- por ler. As submissões que já existiam ficam como lidas (o contador começa a zeros). Sem esta coluna a API funciona na mesma,
-- sem estado nem contador por ler.
ALTER TABLE `form_submission`
  ADD COLUMN `is_read` tinyint(4) NOT NULL DEFAULT 0,
  ADD COLUMN `read_at` datetime DEFAULT NULL;

UPDATE `form_submission` SET `is_read` = 1, `read_at` = NOW() WHERE `is_read` = 0;
