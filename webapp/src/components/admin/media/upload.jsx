import axios from "axios";

import endpoints from "../../../utils/endpoints";
import upload from "../../../utils/upload";

// Carrega ficheiros para a biblioteca de Multimédia, um a um (as imagens são comprimidas antes, como sempre).
// onProgress(feitos, total) vai avisando; devolve { uploaded: [nomes guardados], failed: [nomes originais] }.
export async function uploadMediaFiles(files, onProgress) {
  const uploaded = [];
  const failed = [];
  const list = Array.from(files);
  for (let i = 0; i < list.length; i++) {
    const original = list[i];
    onProgress?.(i, list.length);
    try {
      const file = await upload.compress(original);
      const formData = new FormData();
      formData.append("file", file, original.name);
      formData.append("data", JSON.stringify({ type: "multimedia" }));
      const res = await axios.post(endpoints.media.singleUpload, formData);
      // O servidor responde com o nome com que guardou (muda se já existia um ficheiro igual)
      uploaded.push(typeof res.data === "string" ? res.data : original.name);
    } catch (err) {
      console.error(err);
      failed.push(original.name);
    }
  }
  onProgress?.(list.length, list.length);
  return { uploaded, failed };
}
