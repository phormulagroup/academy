import { Modal } from "antd";
import { useTranslation } from "react-i18next";

import Library from "./library";

// Biblioteca de Multimédia: escolher um ficheiro (ou carregar novos). Chama close() sem argumentos se cancelar e
// close({ [mediaKey]: nome }) quando se escolhe um ficheiro.
// `fileType` (opcional): "image" ou "pdf" limita a lista a esse tipo de ficheiro (o tipo que o campo aceita).
function Media({ mediaKey, open, close, fileType }) {
  const { t } = useTranslation();

  return (
    <Modal style={{ top: 20 }} width={1040} id="media-library" title={t("Media Library")} open={open} onCancel={() => close()} maskClosable={false} footer={null} destroyOnHidden>
      <Library mediaKey={mediaKey} fileType={fileType} close={close} />
    </Modal>
  );
}

export default Media;
