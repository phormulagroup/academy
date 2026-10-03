import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Spin } from "antd";
import { useTranslation } from "react-i18next";

import EmailEditorPage from "../../../components/admin/email/emailEditorPage";
import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import { parseJson } from "../../../utils/emailHtml";
import { templateType } from "../../../utils/emailTemplates";
import { usePermission } from "../../../utils/usePermission";

// Templates antigos foram feitos no Unlayer (o design tem "body"); os novos e os refeitos usam o GrapesJS
const isLegacyDesign = (design) => !!design && design.editor !== "grapes" && !!design.body;

// Página só com o editor do conteúdo de um template
export default function TemplateEditor() {
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const perm = usePermission("email_template");
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    axios
      .get(endpoints.email.readById, { params: { id } })
      .then((res) => setData(res.data?.[0] || null))
      .catch((err) => console.log(err));
  }, [id]);

  if (!data) return <Spin className="w-full! py-20!" />;

  const design = parseJson(data.design, null);
  const kind = templateType(data.name_key);

  async function save({ design: nextDesign, html }) {
    try {
      // Só o conteúdo: o nome e o assunto gravam-se nos detalhes
      await axios.post(endpoints.email.update, { data: { name_key: data.name_key, design: nextDesign, html } });
      return true;
    } catch (err) {
      console.log(err);
      toastApi.open({ type: "error", content: t("Something went wrong, try again later.") });
      return false;
    }
  }

  return (
    <EmailEditorPage
      breadcrumb={[{ title: <Link to="/admin/templates">{t("Templates")}</Link> }, { title: <Link to={`/admin/templates/${id}`}>{data.name}</Link> }, { title: t("Content") }]}
      backTo={`/admin/templates/${id}`}
      design={design}
      legacy={isLegacyDesign(design)}
      variables={kind.variables}
      canEdit={perm.canUpdate}
      canRebuild
      onSave={save}
    />
  );
}
