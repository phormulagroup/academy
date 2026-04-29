import { useState } from "react";
import { Button, Col, Row, Modal } from "antd";
import { useTranslation } from "react-i18next";

function Logout({ open, close, submit }) {
  const { t } = useTranslation();
  return (
    <Modal
      key="modal-logout"
      width={400}
      style={{ top: 20 }}
      onCancel={close}
      open={open}
      maskClosable={false}
      footer={[
        <Button onClick={close}>{t("No")}</Button>,
        <Button type="primary" onClick={submit}>
          {t("Yes, log me out")}
        </Button>,
      ]}
    >
      <div className="p-2 pb-0">
        <p className="text-[16px] font-bold">{t("Are you sure you want to log out?")}</p>
      </div>
    </Modal>
  );
}

export default Logout;
