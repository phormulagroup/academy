import { Button, Modal } from "antd";
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
      maskClosable={true}
      className="modal-logout"
      footer={[
        <Button className="main-secondary-cta-button" onClick={close}>
          {t("No")}
        </Button>,
        <Button className="main-cta-button" type="primary" onClick={submit}>
          {t("Yes, log me out")}
        </Button>,
      ]}>
      <div className="modal-logout-body">
        <p className="modal-logout-title">
          {t("Are you sure you want to log out?")}
        </p>
      </div>
    </Modal>
  );
}

export default Logout;
