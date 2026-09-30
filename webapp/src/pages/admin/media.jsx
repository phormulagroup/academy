import { useEffect, useState } from "react";
import {
  CopyOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { Upload, Card, Pagination } from "antd";
import axios from "axios";

import config from "../../utils/config";
import endpoints from "../../utils/endpoints";

import Delete from "../../components/admin/delete";
import upload from "../../utils/upload";
import { useContext } from "react";
import { Context } from "../../utils/context";

const { Dragger } = Upload;
const { Meta } = Card;

function Media() {
  const { user, t, messageApi } = useContext(Context);
  const [selectedMedia, setSelectedMedia] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [media, setMedia] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(32);
  const [minValue, setMinValue] = useState(0);
  const [maxValue, setMaxValue] = useState(32);

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.media.read)
      .then((res) => {
        setMedia(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        messageApi.open({
          type: "error",
          content: t("Failed to load media"),
        });
      });
  }

  const props = {
    name: "file",
    multiple: true,
    showUploadList: false,
    customRequest: handleUpload,
    onChange(info) {
      setIsUploading(true);
      const { status } = info.file;

      if (status === "done") {
        setIsUploading(false);
        messageApi.open({
          type: "success",
          content: `${info.file.name} file uploaded successfully.`,
        });
      } else if (status === "error") {
        messageApi.open({
          type: "error",
          content: `${info.file.name} file upload failed.`,
        });
        setIsUploading(false);
      }

      if (info.file.name === info.fileList[info.fileList.length - 1].name) {
        getData();
      }
    },
    beforeUpload: (file) => {
      console.log(file);
      return new Promise(async (resolve, reject) => {
        try {
          let compressedFile = await upload.compress(file);
          resolve(compressedFile);
        } catch (err) {
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

  function handleCopyClipboard(link) {
    navigator.clipboard.writeText(`${config.server_ip}/media/${link}`);
    messageApi.open({
      type: "success",
      content: t("Image link copied"),
    });
  }

  function handleOpenDelete(item) {
    setSelectedMedia(item);
    setIsOpenDelete(true);
  }

  function handleDeleteSuccess(deletedItem) {
    messageApi.open({
      type: "success",
      content:
        t("Asset") +
        ` "${deletedItem?.name || deletedItem?.id}" ` +
        t("was removed successfully"),
    });
  }

  function handleCloseDelete() {
    setIsOpenDelete(false);
    getData();
  }

  function handleChangePage(e) {
    setCurrentPage(e);
    if (e <= 1) {
      setMinValue(0);
      setMaxValue(itemsPerPage);
    } else {
      let newMinValue = itemsPerPage * (e - 1);
      let newMaxValue = newMinValue + itemsPerPage;
      setMinValue(newMinValue);
      setMaxValue(newMaxValue);
    }
  }

  return (
    <div className="p-2">
      <Delete
        table="media"
        open={isOpenDelete}
        close={handleCloseDelete}
        data={selectedMedia}
        onDeleteSuccess={handleDeleteSuccess}
      />
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-bold">{t("Multimedia")}</p>
        </div>
      </div>
      <div>
        <Dragger {...props}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            {t("Click or drag file to this area to upload")}
          </p>
          <p className="ant-upload-hint">
            {t(
              "Support for a single or bulk upload. Strictly prohibited from uploading company data or other banned files.",
            )}
          </p>
        </Dragger>
      </div>
      <div className="grid grid-cols-8 gap-4 mt-6">
        {media?.slice(minValue, maxValue).map((item) => {
          return (
            <div key={item.id}>
              <Card
                className="media-card"
                cover={
                  item.name.includes("pdf") ? (
                    <div className="flex! justify-center items-center min-h-25">
                      <FilePdfOutlined className="text-[50px]" />
                    </div>
                  ) : item.name.includes("pptx") ? (
                    <div className="flex! justify-center items-center min-h-25">
                      <FilePptOutlined className="text-[50px]" />
                    </div>
                  ) : (
                    <div
                      className="flex! justify-center items-center min-h-25 w-full bg-contain bg-center bg-no-repeat"
                      style={{
                        backgroundImage: `url(${config.server_ip}/media/${item.name})`,
                      }}></div>
                  )
                }
                actions={[
                  <CopyOutlined
                    key="copy"
                    onClick={() => handleCopyClipboard(item.name)}
                  />,
                  <DeleteOutlined
                    key="delete"
                    onClick={() => handleOpenDelete(item)}
                  />,
                ]}>
                <Meta
                  title={
                    <p className="font-normal! text-[12px]">{item.name}</p>
                  }
                />
              </Card>
            </div>
          );
        })}
        {media.length > 0 && (
          <div className="col-span-8 mt-4">
            <Pagination
              align="center"
              showSizeChanger={false}
              onChange={handleChangePage}
              pageSize={itemsPerPage}
              defaultCurrent={1}
              current={currentPage}
              total={media.length}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Media;
