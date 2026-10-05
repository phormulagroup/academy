-- Duas secções novas nas permissões, que saem de "Monitorização": o Registo de atividade ("audit": quem criou, editou ou apagou o quê) e os
-- Acessos bloqueados ("security": ver e desbloquear). Para ninguém perder acesso, cada função fica com nas novas o que já tinha em Monitorização
-- (atividade: ver; acessos bloqueados: ver e editar/desbloquear). O Admin tem sempre tudo. Aditivo e repetível: só cria o que falta.
INSERT INTO `permission` (`id_role`, `resource`, `can_create`, `can_read`, `can_update`, `can_delete`)
SELECT p.`id_role`, 'audit', 0, p.`can_read`, 0, 0 FROM `permission` p
WHERE p.`resource` = 'monitoring' AND p.`can_read` = 1
  AND NOT EXISTS (SELECT 1 FROM `permission` x WHERE x.`id_role` = p.`id_role` AND x.`resource` = 'audit');

INSERT INTO `permission` (`id_role`, `resource`, `can_create`, `can_read`, `can_update`, `can_delete`)
SELECT p.`id_role`, 'security', 0, p.`can_read`, p.`can_update`, 0 FROM `permission` p
WHERE p.`resource` = 'monitoring' AND p.`can_read` = 1
  AND NOT EXISTS (SELECT 1 FROM `permission` x WHERE x.`id_role` = p.`id_role` AND x.`resource` = 'security');
