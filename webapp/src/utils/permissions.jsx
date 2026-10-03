// Mesmas chaves do servidor (server/utils/permissions.js): povoam a matriz de permissões das funções e ligam cada
// secção do backoffice ao seu menu. `label` é uma chave de tradução (usar t(label)).
export const RESOURCES = [
	{ key: "course", label: "Courses" },
	{ key: "certificate", label: "Certificates" },
	{ key: "report", label: "Reports" },
	{ key: "document", label: "Documents" },
	{ key: "download", label: "Downloads" },
	{ key: "product", label: "Products" },
	{ key: "media", label: "Multimedia" },
	{ key: "iec", label: "IECs" },
	{ key: "faqs", label: "FAQs" },
	{ key: "notification", label: "Notification" },
	{ key: "language", label: "Languages" },
	{ key: "personalization", label: "Personalization" },
	{ key: "user", label: "Users" },
	{ key: "user_group", label: "User groups" },
	{ key: "form_submission", label: "Answers" },
	{ key: "ticket", label: "Tickets" },
	{ key: "monitoring", label: "System monitoring" },
	{ key: "communication", label: "Communications" },
	{ key: "email_template", label: "Templates" },
	{ key: "settings", label: "Settings (SMTP)" },
];

// Primeiro segmento do caminho do backoffice (/admin/<segmento>) → secção que o controla.
// Sem entrada (painel, caixa de entrada, a minha conta) é livre para quem tem acesso ao backoffice;
// "permissions" é só do Admin.
export const ADMIN_PATH_RESOURCES = {
	courses: "course",
	certificate: "certificate",
	reports: "report",
	documents: "document",
	downloads: "download",
	products: "product",
	media: "media",
	iec: "iec",
	faqs: "faqs",
	notification: "notification",
	languages: "language",
	personalization: "personalization",
	users: "user",
	"user-groups": "user_group",
	answers: "form_submission",
	tickets: "ticket",
	monitoring: "monitoring",
	communications: "communication",
	templates: "email_template",
	smtp: "settings",
};
