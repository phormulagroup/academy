import { useEffect, useMemo, useState } from "react";
import {
  CopyOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileOutlined,
  VideoCameraOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { Upload, Card, Pagination, Input, Segmented } from "antd";
import axios from "axios";

import config from "../../utils/config";
import endpoints from "../../utils/endpoints";

import Delete from "../../components/admin/delete";
import upload from "../../utils/upload";
import { useContext } from "react";
import { Context } from "../../utils/context";

const { Dragger } = Upload;
const { Meta } = Card;

const EXTENSIONS = {
  image: ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "bmp"],
  pdf: ["pdf"],
  presentation: ["ppt", "pptx"],
  video: ["mp4", "mov", "webm", "avi", "mkv"],
};

function getFileType(name = "") {
  const ext = name.split(".").pop().toLowerCase();
  return Object.keys(EXTENSIONS).find((k) => EXTENSIONS[k].includes(ext)) || "other";
}

function Media() {
  const { user, t, messageApi } = useContext(Context);
  const [selectedMedia, setSelectedMedia] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [media, setMedia] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(32);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredMedia = useMemo(() => {
    const term = search.trim().toLowerCase();
    return media.filter(
      (item) =>
        (typeFilter === "all" || getFileType(item.name) === typeFilter) &&
        (!term || item.name.toLowerCase().includes(term)),
    );
  }, [media, search, typeFilter]);

  const minValue = (currentPage - 1) * itemsPerPage;
  const maxValue = minValue + itemsPerPage;

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
  }

  function handleSearch(e) {
    setSearch(e.target.value);
    setCurrentPage(1);
  }

  function handleTypeFilter(value) {
    setTypeFilter(value);
    setCurrentPage(1);
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
          <p className="text-xl font-bold font-ryker">{t("Multimedia")}</p>
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
      <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
        <Segmented
          value={typeFilter}
          onChange={handleTypeFilter}
          options={[
            { label: t("All"), value: "all" },
            { label: t("Images"), value: "image" },
            { label: "PDF", value: "pdf" },
            { label: t("Presentations"), value: "presentation" },
            { label: t("Videos"), value: "video" },
            { label: t("Other"), value: "other" },
          ]}
        />
        <Input.Search
          allowClear
          className="max-w-xs"
          placeholder={t("Search by file name")}
          value={search}
          onChange={handleSearch}
        />
      </div>
      <div className="grid grid-cols-8 gap-4 mt-4">
        {filteredMedia.slice(minValue, maxValue).map((item) => {
          return (
            <div key={item.id}>
              <Card
                className="media-card"
                cover={
                  getFileType(item.name) === "pdf" ? (
                    <div className="flex! justify-center items-center min-h-25">
                      <FilePdfOutlined className="text-[50px]" />
                    </div>
                  ) : getFileType(item.name) === "presentation" ? (
                    <div className="flex! justify-center items-center min-h-25">
                      <FilePptOutlined className="text-[50px]" />
                    </div>
                  ) : getFileType(item.name) === "video" ? (
                    <div className="flex! justify-center items-center min-h-25">
                      <VideoCameraOutlined className="text-[50px]" />
                    </div>
                  ) : getFileType(item.name) === "other" ? (
                    <div className="flex! justify-center items-center min-h-25">
                      <FileOutlined className="text-[50px]" />
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
        {media.length > 0 && filteredMedia.length === 0 && (
          <p className="col-span-8 text-center text-gray-500 py-8">
            {t("No files found")}
          </p>
        )}
        {filteredMedia.length > 0 && (
          <div className="col-span-8 mt-4">
            <Pagination
              align="center"
              showSizeChanger={false}
              onChange={handleChangePage}
              pageSize={itemsPerPage}
              defaultCurrent={1}
              current={currentPage}
              total={filteredMedia.length}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Media;
