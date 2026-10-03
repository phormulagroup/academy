import axios from "axios";
import { Suspense, lazy, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Breadcrumb, Button, Modal, Spin } from "antd";
import EmailEditor from "react-email-editor";
import { IoReturnDownBackOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import PageFooter from "../pageFooter";
import { Context } from "../../../utils/context";
import config from "../../../utils/config";
import endpoints from "../../../utils/endpoints";
import { EMAIL_FONTS } from "../../../utils/emailFonts";
import { VARIABLES } from "../../../utils/emailTemplates";

// O editor novo (GrapesJS + MJML) carrega à parte: é grande e só se usa nestas páginas
const GrapesEditor = lazy(() => import("./grapesEditor"));

// Página só com o editor de e-mails (templates e comunicações). A página de detalhes mostra a pré-visualização e leva aqui.
// - `design`: o desenho guardado (objeto) ou null; `legacy`: é um desenho do editor antigo (Unlayer), que continua a abrir
// - `onSave({ design, html })`: grava e devolve true se correu bem
// - `canRebuild`: permite refazer um desenho antigo no editor novo
export default function EmailEditorPage({ breadcrumb, backTo, design, legacy = false, variables = [], canEdit = true, canRebuild = false, onSave }) {
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [kind, setKind] = useState(legacy ? "unlayer" : "grapes");
  const [currentDesign, setCurrentDesign] = useState(design);
  const [reloadKey, setReloadKey] = useState(0);
  const [editorReady, setEditorReady] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const grapesRef = useRef(null);
  const unlayerRef = useRef(null);
  // O Unlayer também dispara "design:updated" ao carregar: só conta como alteração depois de estabilizar
  const listenChanges = useRef(false);

  // Avisa ao fechar o separador com alterações por guardar
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const mergeTags = useMemo(() => Object.fromEntries(variables.map((key) => [key, { name: t(VARIABLES[key].label), value: `{{${key}}}` }])), [variables, t]);

  function onUnlayerReady(unlayer) {
    setEditorReady(true);
    listenChanges.current = false;
    unlayer.loadDesign(currentDesign || {});
    setTimeout(() => (listenChanges.current = true), 1000);
    unlayer.addEventListener("design:updated", () => {
      if (listenChanges.current) setIsDirty(true);
    });
    unlayer.registerCallback("image", (file, done) => {
      const formData = new FormData();
      formData.append("file", file.attachments[0]);
      axios
        .post(endpoints.email.upload, formData, { headers: { "Content-Type": "multipart/form-data" } })
        .then((res) => done({ progress: 100, url: `${config.server_ip}/media/${res.data.data.url}` }))
        .catch((err) => {
          console.log(err);
          toastApi.open({ type: "error", content: t("The image could not be uploaded") });
          done({ progress: 100, url: "" });
        });
    });
  }

  // { design, html } do editor que estiver ativo
  const getContent = () =>
    new Promise((resolve) => {
      if (kind === "grapes") {
        const content = grapesRef.current?.getContent();
        if (!content) return resolve(null);
        if (content.errors?.length) console.warn(content.errors);
        return resolve({ design: content.design, html: content.html });
      }
      const unlayer = unlayerRef.current?.editor;
      if (!unlayer) return resolve(null);
      unlayer.exportHtml(({ design: exported, html }) => resolve({ design: exported, html }));
    });

  async function save(andClose = false) {
    const content = await getContent();
    if (!content) return;
    setIsSaving(true);
    try {
      const ok = await onSave(content);
      if (!ok) return;
      setIsDirty(false);
      toastApi.open({ type: "success", content: t("Content saved") });
      if (andClose) navigate(backTo);
    } finally {
      setIsSaving(false);
    }
  }

  function goBack() {
    if (!isDirty) return navigate(backTo);
    Modal.confirm({
      title: t("Leave without saving?"),
      content: t("The changes made to the content will be lost"),
      okText: t("Leave"),
      okButtonProps: { danger: true },
      cancelText: t("Stay"),
      onOk: () => navigate(backTo),
    });
  }

  function rebuild() {
    Modal.confirm({
      title: t("Rebuild this template in the new editor?"),
      content: t("The design starts from a new base. The current content stays saved until you click Save"),
      okText: t("Rebuild"),
      cancelText: t("Cancel"),
      onOk: () => {
        setEditorReady(false);
        setCurrentDesign(null);
        setKind("grapes");
        setReloadKey((k) => k + 1);
        setIsDirty(true);
      },
    });
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4!">
        <Breadcrumb items={breadcrumb} />
        <Button type="text" className="text-sm cursor-pointer" icon={<IoReturnDownBackOutline />} onClick={goBack}>
          {t("Go back")}
        </Button>
      </div>

      {kind === "unlayer" && (
        <Alert
          type="info"
          showIcon
          className="mb-4!"
          message={t("This template was made in the previous editor")}
          description={t("It keeps working and can still be edited here. To use the new editor (blocks, columns, saved styles) it has to be rebuilt from scratch: the current content is only replaced when you save")}
          action={
            canRebuild &&
            canEdit && (
              <Button size="small" onClick={rebuild}>
                {t("Rebuild in the new editor")}
              </Button>
            )
          }
        />
      )}

      {kind === "grapes" ? (
        <Suspense fallback={<Spin className="w-full! py-20!" />}>
          <GrapesEditor
            key={reloadKey}
            ref={grapesRef}
            design={currentDesign}
            variables={variables}
            height="calc(100vh - 215px)"
            onReady={() => setEditorReady(true)}
            onChange={() => setIsDirty(true)}
          />
        </Suspense>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden border border-solid border-[#E5E7EB]">
          <EmailEditor
            ref={unlayerRef}
            onReady={onUnlayerReady}
            minHeight="calc(100vh - 215px)"
            options={{ version: "latest", appearance: { theme: "modern_light" }, mergeTags, fonts: { showDefaultFonts: true, customFonts: EMAIL_FONTS.map((f) => ({ label: f.name, value: f.stack, url: f.href })) } }}
          />
        </div>
      )}

      <PageFooter className="justify-end px-12 md:px-14">
        {isDirty && <span className="text-[12px] text-[#8A8D98]">{t("Unsaved changes")}</span>}
        {canEdit && (
          <>
            <Button loading={isSaving} disabled={!isDirty || !editorReady} onClick={() => save(false)}>
              {t("Save")}
            </Button>
            <Button type="primary" loading={isSaving} disabled={!editorReady} onClick={() => save(true)}>
              {t("Save and close")}
            </Button>
          </>
        )}
      </PageFooter>
    </div>
  );
}
