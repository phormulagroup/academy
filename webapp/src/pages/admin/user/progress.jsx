import axios from "axios";
import { useContext } from "react";
import { Collapse, Divider, Popconfirm } from "antd";
import { IoMdClose } from "react-icons/io";
import { RxCheck, RxChevronDown, RxChevronUp, RxSwitch } from "react-icons/rx";
import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";

export default function CourseProgress({ data, user }) {
  const { messageApi } = useContext(Context);
  const { t } = useTranslation();

  function confirm(module, item) {
    removeProgress(module, item);
  }

  function removeProgress(module, item) {
    let findIndexAllItems = data.allItems.findIndex((c) => c.id === item.id && c.type === item.type);
    let itemsToRemove = data.allItems.slice(findIndexAllItems, data.allItems.length);
    let findIndexModulesToRemove = data.modules.findIndex((c) => c.id === module.id);
    let modulesToRemove = data.modules.slice(findIndexModulesToRemove, data.modules.length);
    let tests = data.allItems.filter((c) => c.type === "test");
    console.log(data.course);
    try {
      axios
        .post(endpoints.course.resetProgress, { data: { user: user, module: modulesToRemove, items: itemsToRemove, course: data.course, tests } })
        .then((res) => {
          console.log(res);
        })
        .catch((err) => {
          console.log(err);
        });
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <div className="flex flex-col w-full">
      {data && data.progress?.length > 0 && (
        <div className="flex flex-col w-full gap-4">
          <Divider dashed className="mb-4! mt-6!" />
          <p className="text-center font-bold">{t("Progress")}</p>
          <Collapse
            className="collapse-course"
            size="large"
            bordered={false}
            items={data.modules?.map((item) => ({
              key: item.id,
              label: (
                <div className="flex flex-col">
                  <div className="p-2 flex">
                    {data.progress.length > 0 && data.progress.filter((p) => p.activity_type === "module" && p.id_course_module === item.id).length > 0 ? (
                      <div className={`w-4.25 h-4.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center`}>
                        <RxCheck className="text-white" />
                      </div>
                    ) : (
                      <div className={`w-4.25 h-4.25 rounded-full bg-white border border-[#2F8351]`}></div>
                    )}
                    <div className="flex flex-col ml-4">
                      <p className={`text-[14px]`}>{item.title}</p>
                      <p className="text-[12px] mt-1">
                        {data?.topics && data.topics.filter((_t) => _t.id_course_module === item.id).length > 0
                          ? `${data.topics.filter((_t) => _t.id_course_module === item.id).length} ${t("topic")} ${data?.tests.length > 0 && data.tests.filter((_t) => _t.id_course_module === item.id).length > 0 ? " | " : ""}`
                          : ""}{" "}
                        {` ${data.tests?.length > 0 && data.tests.filter((_t) => _t.id_course_module === item.id).length > 0 ? `${data.tests.filter((_t) => _t.id_course_module === item.id).length} ${t("test")}` : ""}`}
                      </p>
                    </div>
                  </div>
                </div>
              ),
              children: (
                <div className="flex flex-col">
                  {item.description && <div className="p-6">{item.description}</div>}
                  <div className="p-4">
                    {item.items.map((_t, i) => (
                      <div className={`p-4 flex items-center justify-between ${i < item.items.length - 1 ? "border-b border-[#969696]" : ""}`}>
                        <div className="flex justify-center items-center">
                          {data.progress.length > 0 &&
                          data.progress.filter((p) => p.is_completed === 1 && p.activity_type === _t.type && p[`id_course_${_t.type}`] === _t.id).length > 0 ? (
                            <div className={`w-4.25 h-4.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center`}>
                              <RxCheck className="text-white" />
                            </div>
                          ) : (
                            <div className={`w-4.25 h-4.25 rounded-full bg-white border border-[#2F8351]`}></div>
                          )}
                          <p className="text-sm ml-2">{_t.title}</p>
                        </div>
                        <div>
                          <Popconfirm
                            title="Delete the task"
                            description="Are you sure to delete this task?"
                            onConfirm={() => confirm(item, _t, data.course)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <IoMdClose className="cursor-pointer" />
                          </Popconfirm>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            }))}
            expandIconPlacement="end"
            expandIcon={(panelProps) => {
              return (
                <div className="flex justify-center items-center">
                  <div className="mr-2">
                    {panelProps.isActive ? <p className="font-bold text-[12px]">{t("Collapase")}</p> : <p className="font-bold text-[12px]">{t("Expand")}</p>}
                  </div>
                  <div className="w-4 h-4 rounded-full bg-[#FFC600] flex justify-center items-center mr-2">
                    {panelProps.isActive ? <RxChevronUp className="w-3 h-3 text-white" /> : <RxChevronDown className="w-3 h-3 text-white" />}
                  </div>
                </div>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
