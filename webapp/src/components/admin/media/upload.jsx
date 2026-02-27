import { Row, Col, message } from "antd";
import { useContext } from "react";
import axios from "axios";
import { InboxOutlined } from "@ant-design/icons";
import Dragger from "antd/es/upload/Dragger";

import endpoints from "../../../utils/endpoints";
import upload from "../../../utils/upload";
import { Context } from "../../../utils/context";

function Upload() {
  const { selectedEventAdmin } = useContext(Context);
  const props = {
    name: "file",
    multiple: true,
    showUploadList: false,
    customRequest: handleUpload,
    onChange(info) {
      const { status } = info.file;
      if (status !== "uploading") {
        console.log(info.file, info.fileList);
      }
      if (status === "done") {
        message.success(`${info.file.name} file uploaded successfully.`);
      } else if (status === "error") {
        message.error(`${info.file.name} file upload failed.`);
      }
    },
    beforeUpload: (file) => {
      console.log(file);
      return new Promise(async (resolve, reject) => {
        try {
          let compressedFile = await upload.compress(file);
          console.log(compressedFile);
          resolve(compressedFile);
        } catch (err) {
          console.log(err);
          reject(false);
        }
      });
    },
    onDrop(e) {
      console.log("Dropped files", e.dataTransfer.files);
    },
  };

  function handleUpload({ file, onSuccess }) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("data", JSON.stringify({ type: "multimedia" }));
      axios
        .post(endpoints.media.singleUpload, formData)
        .then((res) => {
          onSuccess(res);
        })
        .catch((err) => {
          console.log(err);
          onSuccess(err);
        });
    } catch (err) {
      console.log(err);
      onSuccess(err);
    }
  }

  return (
    <div className="mt-4">
      <Dragger {...props}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Click or drag file to this area to upload</p>
        <p className="ant-upload-hint">Support for a single or bulk upload. Strictly prohibited from uploading company data or other banned files.</p>
      </Dragger>
    </div>
  );
}

export default Upload;
