import { useState } from "react";
import { Button, Col, Row, Modal } from "antd";

function Logout({ open, close, submit }) {
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  function handleClose() {
    close();
  }

  return (
    <Modal
      key="modal-logout"
      width={400}
      style={{ top: 20 }}
      onCancel={handleClose}
      open={open}
      maskClosable={false}
      footer={[
        <Button disabled={isButtonLoading} onClick={handleClose}>
          Não
        </Button>,
        <Button loading={isButtonLoading} type="primary" onClick={submit}>
          Sim
        </Button>,
      ]}
    >
      <div className="p-2 pb-0">
        <p className="text-[16px] font-bold">Tem que a certeza que quer fazer logout?</p>
        <div className="flex just mt-4"></div>
      </div>
    </Modal>
  );
}

export default Logout;
