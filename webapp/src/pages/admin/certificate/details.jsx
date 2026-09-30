import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Form } from "antd";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import CertificateForm from "../../../components/admin/certificate/form";
import CertificatePreview from "../../../components/admin/certificate/preview";
import useFormErrors from "../../../utils/useFormErrors";

export default function CertificateDetails() {
  const { user, messageApi } = useContext(Context);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const [isOpenUpdate, setIsOpenUpdate] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);

  const navigate = useNavigate();

  const [form] = Form.useForm();
  const errors = useFormErrors(form);

  const { id } = useParams();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.course_certificate.readById, {
        params: { id },
      })
      .then((res) => {
        if (res.data.length > 0) {
          setData(res.data[0]);
          preview(res.data[0]);
          form.setFieldsValue(res.data[0]);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  function submit(values) {
    axios
      .post(endpoints.course_certificate.update, { data: values })
      .then((res) => {
        messageApi.open({ type: "success", content: t("Certificate updated successfully!") });
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function preview(data) {
    setPreviewData(data ?? form.getFieldsValue());
  }

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="cursor-pointer" onClick={() => navigate("/admin/certificate")}>
            « {t("Go back")}
          </p>
        </div>
      </div>
      <p className="font-bold text-[20px]">{t("Certificate details")}</p>
      <div className="grid grid-cols-2 gap-8 mt-4">
        <CertificateForm form={form} submit={submit} errors={errors} />
        <CertificatePreview data={previewData} />
      </div>
      <div className="mt-4">
        {/* Valida o formulário antes de gravar (o onFinish do CertificateForm é o submit) */}
        <Button size="large" type="primary" onClick={errors.submit}>
          {t("Save")}
        </Button>
        <Button className="ml-2" size="large" onClick={() => preview()}>
          {t("Preview")}
        </Button>
      </div>
    </div>
  );
}
