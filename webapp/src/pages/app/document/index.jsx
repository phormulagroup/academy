import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Button, Collapse, Divider, Empty } from "antd";
import { FaRegUser } from "react-icons/fa";
import { useContext } from "react";
import { FaChevronRight, FaRegCheckCircle, FaRegCopy, FaRegEdit, FaRegFile, FaRegTimesCircle, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../../components/admin/table";
import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { Link, useNavigate } from "react-router-dom";
import i18n from "../../../utils/i18n";
import config from "../../../utils/config";
import Lottie from "lottie-react";
import trailLoadingAnimation from "../../../assets/Trail-loading.json";
import { useTranslation } from "react-i18next";

export default function Document() {
  const { user, courses, languages } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  const { t } = useTranslation();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.document.readByLang, {
        params: { id_lang: languages.filter((l) => l.code === i18n.language)[0].id },
      })
      .then((res) => {
        setData(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  return (
    <div className="container mx-auto p-6 flex flex-col justify-start items-center gap-6 mt-10">
      <p className="text-[30px] font-bold text-center">{t("Library of documents")}</p>
      {isLoading ? (
        <div className="flex justify-center items-center w-full h-full col-span-3">
          <Lottie animationData={trailLoadingAnimation} loop={true} className="max-w-30" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-4 gap-4">
          {data.map((d) => (
            <Link className="flex flex-col gap-2 border border-[#000] rounded cursor-pointer" to={`/${i18n.language}/documents/${d.slug}`}>
              <div>
                <div className="bg-center bg-cover h-[200px] w-full" style={{ backgroundImage: `url(${config.server_ip}/media/${d.img})` }}></div>
                <div className="p-4 flex flex-col gap-2 justify-between items-center">
                  <p className="text-lg font-bold">{d.name}</p>
                  <Button className="mt-2" size="large" type="primary">
                    Read more
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mb-4">
          <Empty description="No documents found" />
        </div>
      )}
    </div>
  );
}
