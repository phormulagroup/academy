import axios from "axios";
import { useContext, useEffect, useRef } from "react";
import { useState } from "react";
import { Button, Dropdown, Spin, Tag } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../../components/table";
import Create from "../../../components/language/create";
import Update from "../../../components/language/update";
import Delete from "../../../components/delete";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { AiOutlineLoading, AiOutlinePlus } from "react-icons/ai";
import Translations from "../../../components/language/translations";
import { useTranslation } from "react-i18next";
import { RxReload } from "react-icons/rx";
import EmailEditor from "react-email-editor";
import { useNavigate, useParams } from "react-router-dom";

export default function TemplateDetails() {
  const { user, messageApi } = useContext(Context);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [data, setData] = useState(null);

  const emailEditorRef = useRef(null);

  let { id } = useParams();

  const navigate = useNavigate();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    axios
      .get(endpoints.email.readById, {
        params: { id },
      })
      .then((res) => {
        if (res.data && res.data[0]) {
          setIsLoading(false);
          setData(res.data[0]);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }

  const exportHtml = () => {
    return new Promise((resolve, reject) => {
      const unlayer = emailEditorRef.current?.editor;

      unlayer?.exportHtml((data) => {
        const { design, html } = data;
        resolve(html);
      });
    });
  };

  const saveDesign = () => {
    return new Promise((resolve, reject) => {
      const unlayer = emailEditorRef.current?.editor;

      unlayer?.saveDesign((data) => {
        resolve(data);
      });
    });
  };

  const onReady = (unlayer) => {
    unlayer?.loadDesign(JSON.parse(data.design));
    unlayer.registerCallback("image", function (file, done) {
      // Do something to upload the image and return the URL of the uploaded image
      var formData = new FormData();
      formData.append("file", file.attachments[0]);
      axios
        .post(endpoints.email.upload, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        .then((res) => {
          done({ progress: 100, url: `${config.server_ip}/media/${res.data.data.url}` });
        })
        .catch((err) => {
          console.log(err);
          return false;
        });
    });
  };

  async function submit() {
    setIsButtonLoading(true);
    let html = await exportHtml();
    let design = await saveDesign();

    axios
      .post(endpoints.email.update, {
        data: {
          name_key: data.name_key,
          name: data.name,
          subject: data.subject,
          design: design,
          html: html,
        },
      })
      .then((res) => {
        messageApi.open({ type: "success", content: t("Template updated successfully!") });
        setIsButtonLoading(false);
      })
      .catch((err) => {
        console.log(err);
        messageApi.open({ type: "error", content: t("Something went wrong, try again later!") });
        setIsButtonLoading(false);
      });
  }

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="cursor-pointer" onClick={() => navigate("/admin/templates")}>
            « {t("Go back")}
          </p>
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-bold">{data?.name}</p>
        </div>
        <div>
          <Button size="large" onClick={getData} icon={<RxReload />} className="mr-2" />
          <Button disabled={isButtonLoading} className="mr-2" size="large" onClick={exportHtml}>
            Export HTML
          </Button>
          <Button loading={isButtonLoading} type="primary" size="large" onClick={submit}>
            Guardar
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center mb-4 mt-4">
          <Spin spinning={true} />
        </div>
      ) : (
        <div className="flex flex-col w-full">
          <div className="flex justify-center items-center mb-4"></div>

          <EmailEditor
            ref={emailEditorRef}
            onReady={onReady}
            options={{
              version: "latest",
              appearance: {
                theme: "modern_light",
              },
            }}
            style={{
              contentWidth: "100%",
            }}
          />
        </div>
      )}
    </div>
  );
}
