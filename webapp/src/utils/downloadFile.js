/**
 * @function downloadFile
 * @description Descarrega um ficheiro do URL fornecido, tentando primeiro via blob e, em caso de falha devido a CORS, abrindo o URL num novo separador.
 * @param {string} url - O URL do ficheiro a descarregar.
 * @param {string} fileName - O nome com que guardar o ficheiro.
 * @returns {Promise<"blob"|"direct">} - Resolve com "blob" se o download foi feito via blob, "direct" se foi feito abrindo um novo separador.
 */

export default async function downloadFile(url, fileName) {
  let response;
  try {
    response = await fetch(url, { mode: "cors", credentials: "omit" });
  } catch {
    // Erro de rede/CORS: o ficheiro pode existir, mas não é legível por JavaScript
    triggerDownload(url, fileName, true);
    return "direct";
  }

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  try {
    triggerDownload(blobUrl, fileName, false);
  } finally {
    // Dá tempo ao browser para iniciar o download antes de libertar o blob
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);
  }
  return "blob";
}

function triggerDownload(href, fileName, newTab) {
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName || "";
  if (newTab) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
