import axios from "axios";
import { useEffect } from "react";
import { useState } from "react";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { Breadcrumb, Button, Tabs, Tag } from "antd";
import { IoReturnDownBackOutline } from "react-icons/io5";
import Constructor from "./constructor";
import { Link, useNavigate, useParams } from "react-router-dom";
import Settings from "./settings";

export default function CourseDetails() {
  const [data, setData] = useState(null);
  // Título e estado do cabeçalho: atualizam-se ao guardar a Configuração, sem tocar em `data` (que o Construtor também usa)
  const [meta, setMeta] = useState({});
  // Só o separador visível mostra o seu rodapé (os dois ficam montados)
  const [activeTab, setActiveTab] = useState("1");

  const { t } = useTranslation();
  const navigate = useNavigate();
  let { id } = useParams();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    axios
      .get(endpoints.course.readById, {
        params: { id },
      })
      .then((res) => {
        if (res.data.course && res.data.course.length > 0) {
          setData(res.data.course[0]);
          setMeta({ name: res.data.course[0].name, internal_name: res.data.course[0].internal_name, status: res.data.course[0].status });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }

  const title = meta.internal_name || meta.name;
  const isPublished = meta.status === "published";

  return (
    <div>
      <div className="flex justify-between items-center mb-4!">
        <Breadcrumb
          items={[
            { title: <Link to="/admin/courses">{t("Courses")}</Link> },
            { title },
          ]}
        />
        <Button
          type="text"
          onClick={() => navigate("/admin/courses")}
          className="text-sm cursor-pointer"
          icon={<IoReturnDownBackOutline />}>
          {t("Go back")}
        </Button>
      </div>
      <div className="bg-white shadow rounded-[16px]">
        <div className="bg-white rounded-t-[16px] p-6 pb-4 flex justify-between items-center gap-4 flex-wrap border-b border-[#F0F0F0]">
          <div className="min-w-0 flex items-center gap-3 flex-wrap">
            <p className="text-xl font-bold mb-0! mt-1">{title}</p>
            {meta.status && (
              <Tag color={isPublished ? "green" : "gold"}>
                {isPublished ? t("Published") : t("Draft")}
              </Tag>
            )}
            {data?.is_deleted ? <Tag color="red">{t("Inactive")}</Tag> : null}
          </div>
        </div>
        <div className="p-6 pt-2">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                // Primeiro a configuração (é onde se identifica o curso), depois o construtor da estrutura
                key: "1",
                label: t("Configuration"),
                forceRender: true,
                children: <Settings course={data} isActive={activeTab === "1"} onSaved={(values) => setMeta((prev) => ({ ...prev, ...values }))} />,
              },
              {
                key: "2",
                label: t("Constructor"),
                forceRender: true,
                children: <Constructor course={data} isActive={activeTab === "2"} />,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
