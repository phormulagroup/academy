import { useContext, useState } from "react";
import { Form, Select } from "antd";
import { LuUserCog } from "react-icons/lu";

import { useTranslation } from "react-i18next";
import axios from "axios";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import { requiredSelectRule } from "../../../utils/formFieldError";
import ConfirmModal from "../confirmModal";

export default function Status({ data, open, close, status }) {
  const { createLog, selectedLanguage, user, toastApi } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [form] = Form.useForm();

  const { t } = useTranslation();

  function onClose() {
    close();
  }

  async function submit(values) {
    setIsButtonLoading(true);
    try {
      const res = await axios.post(endpoints.user.changeStatus, {
        data: { ...data, status: values.status },
      });
      await createLog({
        id_user: user.id,
        action: "status",
        table_name: "user",
        meta_data: JSON.stringify({ ...data, status: values.status }),
        id_lang: selectedLanguage.id,
      });
      console.log(res);
      setIsButtonLoading(false);
      toastApi.success(t("User status updated successfully"));
      close(true);
    } catch (err) {
      console.log(err);
      toastApi.error(t("Something went wrong, please try again"));
      setIsButtonLoading(false);
    }
  }

  return (
    <ConfirmModal
      open={open}
      onCancel={onClose}
      onConfirm={form.submit}
      loading={isButtonLoading}
      tone="info"
      icon={<LuUserCog />}
      title={t("Change user status")}
      description={t("Are you sure that you want to change status of this user?")}
      okText={t("Save")}
      cancelText={t("Cancel")}>
      <div className="mb-4 rounded-[10px] bg-[#F6F7F9] p-3 text-[13px]">
        <p className="mb-1!">
          <b>{t("Name")}</b>: {data.name}
        </p>
        <p className="mb-0!">
          <b>{t("E-mail")}</b>: {data.email}
        </p>
      </div>
      <Form
            form={form}
            onFinish={submit}
            layout="vertical"
            >
            <Form.Item
              rules={[requiredSelectRule]}
              name="status"
              label={t("New status")}>
              <Select
                size="large"
                className="w-full"
                placeholder={t("Select new status")}
                options={[
                  {
                    label: t("Approved"),
                    value: "approved",
                  },
                  {
                    label: t("Pending"),
                    value: "pending",
                  },
                  {
                    label: t("Not Approved"),
                    value: "not_approved",
                  },
                ]}
              />
            </Form.Item>
            {/* A atividade acompanha o estado: aprovado → ativo; pendente/não aprovado → inativo */}
            <p className="text-[12px] text-[#8B9CC3]">
              {t(
                "Approved users become active; pending or not approved users become inactive.",
              )}
            </p>
          </Form>
    </ConfirmModal>
  );
}
