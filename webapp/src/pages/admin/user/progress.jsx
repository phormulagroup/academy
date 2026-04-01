import axios from "axios";
import { useContext, useEffect, useRef } from "react";
import { useState } from "react";
import { Button, Collapse, DatePicker, Divider, Dropdown, Form, Input, Popconfirm, Progress, Select, Tabs, Tag, Tooltip } from "antd";
import { IoMdClose, IoMdMore, IoMdRefresh } from "react-icons/io";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../../components/admin/table";
import Create from "../../../components/admin/user/create";
import Update from "../../../components/admin/user/update";
import Logs from "../../../components/admin/logs";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { RxCheck, RxChevronDown, RxChevronUp, RxSwitch } from "react-icons/rx";
import { useTranslation } from "react-i18next";
import Status from "../../../components/admin/user/status";
import { useNavigate, useParams } from "react-router-dom";
import UserCard from "../../../components/admin/user/card";
import DownloadCloudIcon from "../../../assets/download-cloud.svg?react";
import CertificateIconWhite from "../../../assets/Certificado-digital.svg?react";
import dayjs from "dayjs";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import TimeIcon from "../../../assets/Backoffice/Tempo.svg?react";
import PassedIcon from "../../../assets/Backoffice/Status-01.svg?react";
import NotPassedIcon from "../../../assets/Backoffice/Status-02.svg?react";
import CorrectIcon from "../../../assets/Backoffice/Pontos.svg?react";
import CalendarIcon from "../../../assets/Backoffice/calendar.svg?react";
import TestIcon from "../../../assets/Backoffice/Teste.svg?react";

export default function CourseProgress({ data }) {
  const { messageApi } = useContext(Context);
  const { t } = useTranslation();
  const [progressData, setProgressData] = useState([]);

  useEffect(() => {
    console.log(data);
    if (data.progress.length > 0) {
      let aux = data.progress.map((p) => {
        console.log(data.allItems.filter((item) => item.id === p.id_course_topic && item.type === "topic"));
        return {
          ...p,
          course_name: data.course.name,
          topic_name: data.allItems.filter((item) => item.id === p.id_course_topic && item.type === "topic")[0]?.title,
          module_name: data.modules.filter((item) => item.id === p.id_course_module && item.type === "module")[0]?.title,
        };
      });
      console.log(aux);
      setProgressData(aux);
    }
  }, [data]);

  function prepareData(arr) {
    let aux = [];
    for (let i = 0; i < arr.length; i++) {
      let item = arr[i];
      let topic = data.allItems.filter((it) => it.id === item.id_course_topic && it.type === "topic")[0];
      let module = data.modules.filter((m) => m.id === item.id_course_module)[0];
      aux.push({
        ...item,
        topic_name: topic ? topic.title : "",
        module_name: module ? module.title : "",
        course_name: data.course.name,
      });
    }
    setProgressData(aux);
  }

  const confirm = (e) => {
    console.log(e);
    messageApi.success("Click on Yes");
  };
  const cancel = (e) => {
    console.log(e);
    messageApi.error("Click on No");
  };

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
                          <Popconfirm title="Delete the task" description="Are you sure to delete this task?" onConfirm={confirm} onCancel={cancel} okText="Yes" cancelText="No">
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
