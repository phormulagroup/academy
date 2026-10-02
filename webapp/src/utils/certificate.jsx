import axios from "axios";
import dayjs from "dayjs";
import { message } from "antd";

import endpoints from "./endpoints";
import i18n from "./i18n";

// Guarda no computador um ficheiro recebido do servidor
function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Com responseType "blob" a mensagem de erro do servidor também chega como blob: lê-a para a mostrar
async function errorMessage(err) {
  try {
    const body = JSON.parse(await err.response.data.text());
    if (body?.message) return body.message;
  } catch {
    // sem corpo legível: usa a mensagem genérica
  }
  return i18n.t("The certificate could not be generated");
}

/**
 * @function downloadCertificate
 * @description Descarrega o certificado de um curso para um utilizador. O PDF é gerado no servidor (o mesmo código da
 * pré-visualização do backoffice), a partir do modelo do curso: fundo, texto, alinhamento e posição.
 * @param {Object} item - O curso (id_course_certificate, id, name).
 * @param {Array} progress - O progresso do utilizador (para a data de conclusão).
 * @param {Object} user - O utilizador.
 */
export const downloadCertificate = (item, progress, user) => {
  const completed = progress.filter((p) => p.id_course === item.id && p.activity_type === "course");
  const fileName = `${item.name}-${user.name.replace(/\s+/g, "-")}.pdf`;

  axios
    .post(
      endpoints.course_certificate.generate,
      {
        data: {
          id: item.id_course_certificate,
          name: user.name,
          course: item.name,
          date: completed.length > 0 ? dayjs(completed[0]?.created_at).format("YYYY-MM-DD HH:mm") : null,
          fileName,
        },
      },
      { responseType: "blob" },
    )
    .then((res) => saveBlob(res.data, fileName))
    .catch(async (err) => {
      console.log(err);
      message.error(await errorMessage(err));
    });
};
