import { useContext, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";

import endpoints from "../../utils/endpoints";
import { Context } from "../../utils/context";
import ConfirmModal from "./confirmModal";

// Confirmação para apagar um registo (data.id e data.name/title); `table` escolhe o endpoint e o nome mostrado
export default function Delete({ open, close, data, table, onDeleteSuccess }) {
  const { toastApi, createLog, user, selectedLanguage } = useContext(Context);
  const { t } = useTranslation();
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [tablesName] = useState({ account: t("Account"), course: t("Course"), course_certificate: t("Certificate"), project: t("Project"), test: t("Test"), question: t("Question"), answer: t("Answer"), media: t("Media"), user: t("User"), document: t("Document"), download: t("Download"), iec: t("IEC"), userGroup: t("User group"), role: t("Role") });

  async function submit() {
    try {
      setIsButtonLoading(true);
      await axios.post(endpoints[table].delete, { data });
      createLog({
        id_user: user.id,
        action: "delete",
        table_name: table,
        meta_data: JSON.stringify(data),
        id_lang: selectedLanguage.id,
      });
      close(true);

      // Callback personalizado, se existir; senão a mensagem padrão
      if (onDeleteSuccess) onDeleteSuccess(data);
      else toastApi.success(`${tablesName[table]} ${t("was successfully deleted and is considered inactive.")}`);
    } catch (err) {
      console.log(err);
      toastApi.error(err.response?.data?.message || t("Something went wrong, please try again"));
    } finally {
      setIsButtonLoading(false);
    }
  }

  return (
    <ConfirmModal open={open} onCancel={() => close()} onConfirm={submit} loading={isButtonLoading} tone="danger" title={t("Are you sure you want to delete this item?")} okText={t("Delete")} cancelText={t("Cancel")}>
      <div className="rounded-[10px] bg-[#F6F7F9] p-3 text-[13px]">
        <p className="mb-1! text-[11px] uppercase tracking-wide text-[#8A8D98]">{tablesName[table]}</p>
        <p className="mb-0! font-bold">{data?.name ?? data?.title ?? "-"}</p>
        <p className="mb-0! text-[#8A8D98]">ID: {data?.id}</p>
      </div>
    </ConfirmModal>
  );
}
