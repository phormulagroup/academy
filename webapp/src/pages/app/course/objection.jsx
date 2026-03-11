import { useTranslation } from "react-i18next";
import MaterialIcon from "../../../assets/Materiais.svg?react";
import config from "../../../utils/config";
import { useEffect } from "react";
import { Collapse, Tabs } from "antd";

export default function CourseObjection({ data }) {
  const { t } = useTranslation();

  useEffect(() => {
    console.log(data);
  }, []);

  function downloadFile(item) {
    window.open(`${config.server_ip}/media/${item.file}`, "_blank");
  }

  return (
    <div className="mb-10">
      {data.objection && Object.keys(data.objection).length > 0 ? (
        <div className="flex flex-col">
          {data.objection.text && (
            <div key="objection-text">
              <div dangerouslySetInnerHTML={{ __html: data.objection.text }} />
            </div>
          )}
          {data.objection.tabs.length === 1 ? (
            <div></div>
          ) : (
            <div className="w-full mt-4" onClick={() => downloadFile(m)}>
              <Tabs
                type="card"
                size="large"
                items={data.objection.tabs.map((t, _tind) => ({
                  key: _tind,
                  label: t.label,
                  children: (
                    <Collapse
                      items={t.items.map((_i, _ind) => ({
                        key: `${t.label}-${_ind}`,
                        label: _i.title,
                        children: <div dangerouslySetInnerHTML={{ __html: _i.text }} />,
                      }))}
                    />
                  ),
                }))}
              />
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-500">No objections available.</p>
      )}
    </div>
  );
}
