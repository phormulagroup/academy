import { useState } from "react";
import { Button, Col, Row, Modal } from "antd";
import { useTranslation } from "react-i18next";

function Logout({ open, close, submit }) {
  return (
    <Modal
      key="modal-logout"
      width={400}
      style={{ top: 20 }}
      onCancel={close}
      open={open}
      maskClosable={false}
      footer={[
        <Button onClick={close}>NN</Button>,
        <Button type="primary" onClick={submit}>
          YY
        </Button>,
      ]}
    >
      <div className="p-2 pb-0">
        <p className="text-[16px] font-bold">Tem que a certeza que quer fazer logout?</p>
      </div>
    </Modal>
  );
}

export default Logout;
