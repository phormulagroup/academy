-- Ordem das FAQs (drag and drop no backoffice; o site mostra-as nesta ordem). Aditivo: acrescenta `position` e preenche-a com a
-- ordem atual (por id) apenas nas linhas ainda sem posição.
ALTER TABLE `faqs` ADD COLUMN IF NOT EXISTS `position` int(11) NOT NULL DEFAULT 0;
UPDATE `faqs` SET `position` = `id` WHERE `position` = 0;
