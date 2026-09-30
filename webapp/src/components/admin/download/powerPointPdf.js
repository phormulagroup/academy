import config from "../../../utils/config";

// Um PowerPoint de um download só pode ser adicionado se existir na Multimédia a sua versão PDF,
// com exatamente o mesmo nome (ex.: 02_Kit.pptx -> 02_Kit.pdf). É essa versão que o Preview mostra na app.
export const isPowerPoint = (file) => /\.(pptx?|ppsx?)$/i.test(file || "");
export const pdfVersionOf = (file) => (file || "").replace(/\.[^.]+$/, ".pdf");

export async function pdfVersionExists(file) {
	try {
		const res = await fetch(`${config.server_ip}/media/${encodeURIComponent(pdfVersionOf(file))}`, { method: "HEAD" });
		return res.ok;
	} catch (err) {
		console.log(err);
		return false;
	}
}

// Chave de tradução do erro (também usada para identificar este erro no onFinishFailed dos formulários)
export const MISSING_PDF_KEY = "Missing PDF version of the PowerPoint";

// Regra do Form: bloqueia a gravação se o ficheiro for PowerPoint sem versão PDF (recebe o t do Context)
export const powerPointPdfRule = (t) => ({
	validator: async (_, value) => {
		if (!isPowerPoint(value)) return;
		if (!(await pdfVersionExists(value))) {
			throw new Error(`${t(MISSING_PDF_KEY)}: "${pdfVersionOf(value)}". ${t("Upload it to the Media library before saving.")}`);
		}
	},
});
