import { Row, Col, Modal, Segmented } from "antd";
import { useContext, useState } from "react";

import Library from "./library";
import Upload from "./upload";
import { Context } from "../../../utils/context";

function Media({ mediaKey, open, close }) {
  const { t } = useContext(Context);
  const [optionSelected, setOptionSelected] = useState("library");

  function onClose(value) {
    close(value);
  }

  function changeSegment(value) {
    setOptionSelected(value);
  }

  return (
    <Modal style={{ top: 20 }} width={1000} id="media-library" title={t("Media Library")} open={open} onCancel={() => onClose()} maskClosable={false} footer={[]}>
      <Segmented
        size="large"
        options={[
          { value: "library", label: t("Library") },
          { value: "upload", label: t("Upload") },
        ]}
        value={optionSelected}
        onChange={changeSegment}
        block
      />
      {optionSelected === "library" ? <Library mediaKey={mediaKey} option={optionSelected} close={onClose} /> : <Upload />}
    </Modal>
  );
}

export default Media;
