-- Os e-mails para a equipa já se distinguem pela coluna "Enviado para" dos Templates: o nome deixa de levar "(equipa)" no fim.
-- Só tira esse sufixo dos nomes que o têm (os que a equipa já renomeou ficam como estão). Repetível; não toca em mais nada.
UPDATE `email_template`
SET `name` = REPLACE(REPLACE(REPLACE(REPLACE(`name`, ' (equipa)', ''), ' (equipo)', ''), ' (team)', ''), ' (équipe)', '')
WHERE `name_key` REGEXP '^(contact_new|registration_new|ticket_new|ticket_user_reply)_[0-9]+$';
