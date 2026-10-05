import axios from "axios";
import { useContext, useEffect, useRef } from "react";
import { useState } from "react";
import { Alert, Breadcrumb, Button, Form, Input, Tag } from "antd";
import { IoReturnDownBackOutline } from "react-icons/io5";
import { RxReload } from "react-icons/rx";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import CertificateForm from "../../../components/admin/certificate/form";
import PageFooter from "../../../components/admin/pageFooter";
import CertificatePreview from "../../../components/admin/certificate/preview";
import useFormErrors from "../../../utils/useFormErrors";

const EMPTY_SAMPLE = { name: "", course: "" };

export default function CertificateDetails() {
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  // Dados de exemplo da pré-visualização (nome do aluno e curso): só servem para testar o texto, nunca se guardam
  const [sample, setSample] = useState(EMPTY_SAMPLE);
  const [isSaving, setIsSaving] = useState(false);
  // Alterações no formulário ainda por guardar (avisa também ao fechar o separador)
  const [isDirty, setIsDirty] = useState(false);
  // Cursos que usam este modelo
  const [courses, setCourses] = useState([]);
  const previewTimer = useRef(null);

  const navigate = useNavigate();

  const [form] = Form.useForm();
  const errors = useFormErrors(form);

  const { id } = useParams();

  useEffect(() => {
    getData();
    getUsage();
    return () => clearTimeout(previewTimer.current);
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  function getData() {
    axios
      .get(endpoints.course_certificate.readById, {
        params: { id },
      })
      .then((res) => {
        if (res.data.length > 0) {
          const row = res.data[0];
          setData(row);
          form.setFieldsValue({ ...row, text_align: row.text_align || "left", text_x: row.text_x ?? null, text_y: row.text_y ?? null });
          setPreviewData({
            background: row.background,
            text: row.text,
            text_align: row.text_align || "left",
            text_x: row.text_x ?? null,
            text_y: row.text_y ?? null,
            sample: EMPTY_SAMPLE,
          });
          setIsDirty(false);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }

  // Informação de apoio: onde este modelo está a ser usado
  function getUsage() {
    axios
      .get(endpoints.course.options)
      .then((res) =>
        setCourses(
          (res.data || []).filter(
            (c) => String(c.id_course_certificate) === String(id) && !c.is_deleted,
          ),
        ),
      )
      .catch(() => setCourses([]));
  }

  // Enquanto a BD não tiver as colunas do alinhamento/posição, não se enviam (o servidor recusaria o guardar)
  const alignSupported = !!data && "text_align" in data;
  const positionSupported = !!data && "text_x" in data;

  function submit(values) {
    const payload = { ...values };
    if (!alignSupported) delete payload.text_align;
    if (!positionSupported) {
      delete payload.text_x;
      delete payload.text_y;
    }
    setIsSaving(true);
    axios
      .post(endpoints.course_certificate.update, { data: payload })
      .then(() => {
        setData((prev) => ({ ...prev, ...payload }));
        setIsDirty(false);
        toastApi.open({ type: "success", content: t("Certificate updated successfully!") });
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => setIsSaving(false));
  }

  function preview(nextSample = sample) {
    const values = form.getFieldsValue();
    setPreviewData({
      background: values.background,
      text: values.text,
      text_align: values.text_align || "left",
      text_x: values.text_x ?? null,
      text_y: values.text_y ?? null,
      sample: nextSample,
    });
  }

  // Qualquer edição marca "por guardar" e agenda uma pré-visualização nova (com atraso: cada uma pede ao servidor
  // para gerar o PDF real, e a meio de uma frase a escrever só a última conta)
  function schedulePreview(nextSample) {
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => preview(nextSample), 600);
  }

  function handleValuesChange() {
    setIsDirty(true);
    schedulePreview();
  }

  function updateSample(patch) {
    const next = { ...sample, ...patch };
    setSample(next);
    schedulePreview(next);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4!">
        <Breadcrumb
          items={[
            { title: <Link to="/admin/certificate">{t("Certificates")}</Link> },
            { title: data?.name },
          ]}
        />
        <Button
          type="text"
          className="text-sm cursor-pointer"
          icon={<IoReturnDownBackOutline />}
          onClick={() => navigate("/admin/certificate")}>
          {t("Go back")}
        </Button>
      </div>

      <div className="bg-white shadow rounded-[16px]">
        <div className="bg-white rounded-t-[16px] p-6 pb-4 flex justify-between items-center gap-4 flex-wrap border-b border-[#F0F0F0]">
          <p className="text-xl font-bold mb-0! mt-1">{data?.name || t("Certificate")}</p>
          <div className="flex items-center gap-2 flex-wrap text-[13px] text-[#666]">
            {courses.length > 0 ? (
              <>
                <span>{t("Used in")}:</span>
                {courses.map((c) => (
                  <Link key={c.id} to={`/admin/courses/${c.id}`}>
                    <Tag className="cursor-pointer m-0!">{c.internal_name || c.name}</Tag>
                  </Link>
                ))}
              </>
            ) : (
              <span>{t("Not associated with any course yet")}</span>
            )}
          </div>
        </div>

        <div className="p-6">
          <Alert
            type="info"
            showIcon
            className="mb-6!"
            message={t(
              "Certificates are generated when the student downloads them, from the current template. When you save, every certificate downloaded from then on uses these changes, including those of students who already completed the course",
            )}
          />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <CertificateForm form={form} submit={submit} preview={handleValuesChange} errors={errors} alignSupported={alignSupported} positionSupported={positionSupported} />

            <div className="xl:sticky xl:top-4 self-start">
              <div className="rounded-[15px] border border-solid border-[#E5E7EB] bg-white overflow-hidden">
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-0 border-b border-solid border-[#F0F0F0]">
                  <div>
                    <p className="text-[16px] font-bold mb-0!">{t("Preview")}</p>
                    <p className="text-[12px] text-[#8A8D98] mb-0!">
                      {t("The real PDF, the same the student downloads. Updates by itself while you edit")}
                    </p>
                  </div>
                  <Button
                    icon={<RxReload />}
                    disabled={isSaving}
                    onClick={() => {
                      clearTimeout(previewTimer.current);
                      preview();
                    }}
                    aria-label={t("Refresh preview")}
                    title={t("Refresh preview")}
                  />
                </div>
                {/* Dados de exemplo: para ver como o texto se comporta com nomes e cursos compridos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-6 py-4 border-0 border-b border-solid border-[#F0F0F0] bg-[#FAFAFB]">
                  <div>
                    <p className="text-[12px] text-[#8A8D98] mb-1!">{t("Student name (example)")}</p>
                    <Input value={sample.name} maxLength={120} placeholder="Maria Silva" onChange={(e) => updateSample({ name: e.target.value })} />
                  </div>
                  <div>
                    <p className="text-[12px] text-[#8A8D98] mb-1!">{t("Course name (example)")}</p>
                    <Input value={sample.course} maxLength={120} placeholder={t("Example course")} onChange={(e) => updateSample({ course: e.target.value })} />
                  </div>
                </div>
                <CertificatePreview data={previewData} />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Rodapé fixo com o Guardar (components/admin/pageFooter.jsx), por baixo da área com scroll. errors.submit valida o
          formulário antes de gravar (o onFinish do CertificateForm é o submit). */}
      <PageFooter className="justify-end px-12 md:px-14">
        {isDirty && <span className="text-[12px] text-[#8A8D98]">{t("Unsaved changes")}</span>}
        <Button type="primary" loading={isSaving} disabled={!isDirty} onClick={errors.submit}>
          {t("Save")}
        </Button>
      </PageFooter>
    </div>
  );
}
