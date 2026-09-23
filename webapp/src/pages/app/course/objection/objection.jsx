import { useContext, useEffect, useState } from "react";
import { Collapse, Tabs } from "antd";
import "./objection.css";
import { Context } from "../../../../utils/context";

export default function CourseObjection({ data }) {
  const { t, windowDimension } = useContext(Context);
  const [activeKey, setActiveKey] = useState("0");

  useEffect(() => {
    console.log(data);
  }, [data]);

  return (
    <div className="mb-10">
      {data.objection &&
      Object.keys(data.objection).length > 0 &&
      data.objection.tabs &&
      data.objection.tabs.length > 0 ? (
        <div className="flex flex-col">
          {data.objection.text && (
            <div key="objection-text" className="prose-content">
              <div dangerouslySetInnerHTML={{ __html: data.objection.text }} />
            </div>
          )}
          <div className="w-full mt-4">
            <Tabs
              className="objection-tabs"
              type="card"
              size="large"
              activeKey={activeKey}
              onChange={(key) => setActiveKey(key)}
              items={data.objection.tabs
                .filter((tabItem) => tabItem.items && tabItem.items.length > 0)
                .map((tabItem, _tind) => ({
                  key: String(_tind),
                  label: (
                    <p
                      className="font-bold text-xs sm:text-sm md:text-base"
                      style={{
                        fontSize:
                          windowDimension.width >= 1225
                            ? "16px"
                            : windowDimension.width >= 425 &&
                                windowDimension.width < 1225
                              ? "14px"
                              : "",
                      }}>
                      {t(tabItem.label)}
                    </p>
                  ),
                  children: (
                    <Collapse
                      className="collapse-objection"
                      size="large"
                      bordered={false}
                      items={tabItem.items.map((_i, _ind) => ({
                        key: `${tabItem.label}-${_ind}`,
                        label: (
                          <p className="text-xs sm:text-sm md:text-base">
                            {_i.title}
                          </p>
                        ),
                        children: (
                          <div
                            className="prose-content text-xs sm:text-sm md:text-base"
                            dangerouslySetInnerHTML={{ __html: _i.text }}
                          />
                        ),
                      }))}
                    />
                  ),
                }))}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center gap-1.5 py-12">
          <p
            className="text-[#163986] uppercase font-semibold text-center"
            style={{
              fontSize:
                windowDimension.width < 425
                  ? "18px"
                  : windowDimension.width < 768
                    ? "18px"
                    : windowDimension.width < 1024
                      ? "19px"
                      : windowDimension.width < 1225
                        ? "19px"
                        : windowDimension.width < 1440
                          ? "20px"
                          : "20px",
            }}>
            {t("No objection books available")}
          </p>
          <p
            className="text-[#163986] font-light text-center"
            style={{
              fontSize:
                windowDimension.width < 425
                  ? "14px"
                  : windowDimension.width < 768
                    ? "14px"
                    : windowDimension.width < 1024
                      ? "15px"
                      : windowDimension.width < 1225
                        ? "15px"
                        : windowDimension.width < 1440
                          ? "16px"
                          : "16px",
            }}>
            {t("Please check back later for objection books.")}
          </p>
        </div>
      )}
    </div>
  );
}
