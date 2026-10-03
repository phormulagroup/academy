import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Spin } from "antd";
import { useTranslation } from "react-i18next";

import EmailEditorPage from "../../../components/admin/email/emailEditorPage";
import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import { parseJson } from "../../../utils/emailHtml";
import { usePermission } from "../../../utils/usePermission";

const EDITOR_VARIABLES = ["name", "email"];

// Página só com o editor do conteúdo de uma comunicação (só rascunhos)
export default function CommunicationEditor() {
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const perm = usePermission("communication");
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    axios
      .get(endpoints.communication.readById, { params: { id } })
      .then((res) => setData(res.data))
      .catch((err) => console.log(err));
  }, [id]);

  if (!data) return <Spin className="w-full! py-20!" />;
  // Agendada, a enviar ou enviada já não se edita
  if (data.status !== "draft") return <Navigate to={`/admin/communications/${id}`} replace />;

  async function save({ design, html }) {
    try {
      await axios.post(endpoints.communication.update, { data: { id: data.id, design, html } });
      return true;
    } catch (err) {
      toastApi.open({ type: "error", content: err.response?.data?.message || t("Something went wrong, try again later.") });
      return false;
    }
  }

  return (
    <EmailEditorPage
      breadcrumb={[{ title: <Link to="/admin/communications">{t("Communications")}</Link> }, { title: <Link to={`/admin/communications/${id}`}>{data.name}</Link> }, { title: t("Content") }]}
      backTo={`/admin/communications/${id}`}
      design={parseJson(data.design, null)}
      variables={EDITOR_VARIABLES}
      canEdit={perm.canUpdate}
      onSave={save}
    />
  );
}
