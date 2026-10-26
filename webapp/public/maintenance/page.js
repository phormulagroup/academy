// Página estática, sem dependências: serve para quando o servidor web devolve erro e a app React não consegue arrancar
var TEXTS = {
	pt: [
		"Estamos com problemas",
		"O serviço pode estar temporariamente indisponível ou em manutenção. Voltamos a tentar automaticamente.",
		"Tentar novamente",
		"A tentar novamente em ",
	],
	en: [
		"We're having problems",
		"The service may be temporarily unavailable or under maintenance. We'll keep trying automatically.",
		"Try again",
		"Trying again in ",
	],
	es: [
		"Estamos teniendo problemas",
		"El servicio puede no estar disponible temporalmente o estar en mantenimiento. Lo volveremos a intentar automáticamente.",
		"Intentar de nuevo",
		"Reintentando en ",
	],
	fr: [
		"Nous rencontrons des problèmes",
		"Le service est peut-être temporairement indisponible ou en maintenance. Nous réessayons automatiquement.",
		"Réessayer",
		"Nouvelle tentative dans ",
	],
};
var fromUrl = location.pathname.split("/")[1];
var fromBrowser = (navigator.language || "en").slice(0, 2);
var t = TEXTS[fromUrl] || TEXTS[fromBrowser] || TEXTS.en;
document.documentElement.lang = TEXTS[fromUrl] ? fromUrl : TEXTS[fromBrowser] ? fromBrowser : "en";
document.getElementById("title").textContent = t[0];
document.getElementById("text").textContent = t[1];
document.getElementById("retry").textContent = t[2];

var left = 20;
var status = document.getElementById("status");
function tick() {
	status.textContent = t[3] + left + "s";
	if (left-- <= 0) location.reload();
}
tick();
setInterval(tick, 1000);
document.getElementById("retry").onclick = function () {
	location.reload();
};
