import { useContext, useState } from "react";
import { Button, Col, Row, Modal } from "antd";
import axios from "axios";
import endpoints from "../../utils/endpoints";
import { Context } from "../../utils/context";
import { useTranslation } from "react-i18next";

export default function Delete({ open, close, data, table }) {
  const { messageApi, createLog, user, selectedLanguage } = useContext(Context);
  const { t } = useTranslation();
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [tablesName] = useState({ account: t("Account"), course: t("Course"), project: t("Project"), test: t("Test"), question: t("Question"), answer: t("Answer") });

  function onClose() {
    close();
  }

  async function submit() {
    try {
      setIsButtonLoading(true);
      await axios.post(endpoints[table].delete, {
        data: data,
      });
      createLog({
        id_user: user.id,
        action: "delete",
        table: table,
        meta_data: JSON.stringify(data),
        id_lang: selectedLanguage.id,
      });
      close(true);
      messageApi.success(`${tablesName[table]} foi apagado com sucesso, é considerado como inativo.`);
      setIsButtonLoading(false);
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <Modal
      key="modal-logout"
      width={400}
      style={{ top: 20 }}
      onCancel={onClose}
      open={open}
      maskClosable={false}
      footer={[
        <Button disabled={isButtonLoading} onClick={onClose}>
          Não
        </Button>,
        <Button loading={isButtonLoading} type="primary" onClick={submit}>
          Sim
        </Button>,
      ]}
    >
      <div className="p-2 pb-0">
        <p className="text-[16px] font-bold">{t("Are you sure you want to delete this item?")}</p>
        <div className="flex flex-col mt-4">
          <p className="font-semibold">{tablesName[table]}</p>
          <p>ID: {data.id}</p>
          <p>
            {t("Name")}/{t("Title")}: <b>{data.name}</b>
          </p>
        </div>
      </div>
    </Modal>
  );
}
