// Validação de tipos de ficheiro escolhidos na Multimédia, partilhada pelos formulários do backoffice
// (documentos, downloads, FAQs, certificados). Usada pelas regras do Form e pelo utils/useMediaPicker.js.

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;
const PDF_EXT = /\.pdf$/i;

const isImageFile = (file) => IMAGE_EXT.test(file || "");
const isPdfFile = (file) => PDF_EXT.test(file || "");

// Chaves de tradução das mensagens
const NOT_IMAGE_KEY = "Please select a valid image file (PNG, JPG, GIF, WEBP, SVG, BMP or AVIF).";
const NOT_PDF_KEY = "The document must be a PDF file.";

const CHECKS = {
	image: { test: isImageFile, key: NOT_IMAGE_KEY },
	pdf: { test: isPdfFile, key: NOT_PDF_KEY },
};

// Regra do Form para um campo de ficheiro: type = "image" | "pdf" (campo vazio é aceite; use required à parte)
export const fileTypeRule = (type, t) => ({
	validator: async (_, value) => {
		if (value && !CHECKS[type].test(value)) throw new Error(t(CHECKS[type].key));
	},
});

// Ao fechar a Multimédia: devolve a mensagem de erro se o ficheiro escolhido não for do tipo do campo, ou null.
// fieldTypes indica o tipo de cada campo, ex.: { img: "image", file: "pdf" }; campos não indicados aceitam tudo.
export function mediaSelectionError(field, value, fieldTypes, t) {
	const type = fieldTypes[field];
	if (!type || !value || CHECKS[type].test(value)) return null;
	return t(CHECKS[type].key);
}
