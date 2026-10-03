// Textos fixos: quando o servidor está em baixo as traduções (que vêm da API) não existem
const TEXTS = {
	pt: {
		down: ["Estamos com problemas", "O serviço pode estar temporariamente indisponível ou em manutenção. Voltamos a tentar automaticamente."],
		offline: ["Sem ligação à Internet", "Verifique a sua ligação. Voltamos a tentar automaticamente."],
		error: ["Algo correu mal", "Ocorreu um erro inesperado. Recarregue a página para continuar."],
		retry: "Tentar novamente",
		retrying: (n) => `A tentar novamente em ${n}s`,
		reload: "Recarregar página",
	},
	en: {
		down: ["We're having problems", "The service may be temporarily unavailable or under maintenance. We'll keep trying automatically."],
		offline: ["No Internet connection", "Please check your connection. We'll keep trying automatically."],
		error: ["Something went wrong", "An unexpected error occurred. Reload the page to continue."],
		retry: "Try again",
		retrying: (n) => `Trying again in ${n}s`,
		reload: "Reload page",
	},
	es: {
		down: [
			"Estamos teniendo problemas",
			"El servicio puede no estar disponible temporalmente o estar en mantenimiento. Lo volveremos a intentar automáticamente.",
		],
		offline: ["Sin conexión a Internet", "Compruebe su conexión. Lo volveremos a intentar automáticamente."],
		error: ["Algo salió mal", "Se produjo un error inesperado. Recargue la página para continuar."],
		retry: "Intentar de nuevo",
		retrying: (n) => `Reintentando en ${n}s`,
		reload: "Recargar página",
	},
	fr: {
		down: [
			"Nous rencontrons des problèmes",
			"Le service est peut-être temporairement indisponible ou en maintenance. Nous réessayons automatiquement.",
		],
		offline: ["Pas de connexion Internet", "Vérifiez votre connexion. Nous réessayons automatiquement."],
		error: ["Une erreur s'est produite", "Une erreur inattendue est survenue. Rechargez la page pour continuer."],
		retry: "Réessayer",
		retrying: (n) => `Nouvelle tentative dans ${n}s`,
		reload: "Recharger la page",
	},
};

// Língua do URL (/pt/...), senão a do browser, senão inglês
export function fallbackTexts() {
	const fromUrl = window.location.pathname.split("/")[1];
	const fromBrowser = (navigator.language || "en").slice(0, 2);
	return TEXTS[fromUrl] || TEXTS[fromBrowser] || TEXTS.en;
}
