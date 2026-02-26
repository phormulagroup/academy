import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Button, Collapse, Divider, Progress, Tabs } from "antd";
import { FaRegUser } from "react-icons/fa";
import { useContext } from "react";
import { FaChevronRight, FaRegCheckCircle, FaRegCopy, FaRegEdit, FaRegFile, FaRegTimesCircle, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../../components/table";
import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useNavigate, useParams } from "react-router-dom";
import { AiOutlineArrowDown, AiOutlineArrowUp, AiOutlineCheck } from "react-icons/ai";
import { useTranslation } from "react-i18next";
import { RxChevronUp, RxChevronDown, RxCheck } from "react-icons/rx";
import dayjs from "dayjs";
import config from "../../../utils/config";
import DurationIcon from "../../../assets/Duracao.svg?react";
import CertificateIcon from "../../../assets/Certificado.svg?react";
import TrainerIcon from "../../../assets/Formador.svg?react";
import VideosIcon from "../../../assets/Videos.svg?react";
import FlagIcon from "../../../assets/Flag.svg?react";
import i18n from "../../../utils/i18n";

export default function CourseContent({ modules, progress, data }) {
  const { t } = useTranslation();

  function calcProgress(items) {
    if (items && items.length > 0) {
      let completed = items
        .map(
          (item) =>
            progress.filter(
              (p) =>
                p.is_completed === 1 &&
                p.id_course_module === item.id_course_module &&
                p.activity_type === item.type &&
                (item.id === p.id_course_topic || item.id === p.id_course_test),
            ).length,
        )
        .reduce((acc, v) => acc + v, 0);

      console.log(completed);

      let progressPercentage = (100 * completed) / items.length;
      const isInteger = progressPercentage % 1 === 0;
      return (
        <p className="text-white">
          <span className="font-bold uppercase">
            {!isInteger ? (Math.round(progressPercentage * 100) / 100).toFixed(2) : progressPercentage}% {t("Completed")}
          </span>{" "}
          | {completed}/{items.length} {t("Steps")}
        </p>
      );
    }
    return <p></p>;
  }

  return (
    <Collapse
      className="collapse-course"
      size="large"
      bordered={false}
      items={modules?.map((item) => ({
        key: item.id,
        label: (
          <div className="flex flex-col">
            <div className="p-2 cursor-pointer flex">
              {progress.length > 0 && progress.filter((p) => p.activity_type === "module" && p.id_course_module === item.id).length > 0 ? (
                <div className={`w-6.25 h-6.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center`}>
                  <RxCheck className="text-white" />
                </div>
              ) : (
                <div className={`w-6.25 h-6.25 rounded-full bg-white border border-[#2F8351]`}></div>
              )}
              <div className="flex flex-col  ml-4">
                <p className={`text-[16px]`}>{item.title}</p>
                <p className="text-[12px] mt-1">
                  {data?.topics && data.topics.filter((_t) => _t.id_course_module === item.id).length > 0
                    ? `${data.topics.filter((_t) => _t.id_course_module === item.id).length} ${t("topic")} ${data?.tests.length > 0 && data.tests.filter((_t) => _t.id_course_module === item.id).length > 0 ? " | " : ""}`
                    : ""}{" "}
                  {` ${data?.tests.length > 0 && data.tests.filter((_t) => _t.id_course_module === item.id).length > 0 ? `${data.tests.filter((_t) => _t.id_course_module === item.id).length} ${t("test")}` : ""}`}
                </p>
              </div>
            </div>
          </div>
        ),
        children: (
          <div className="flex flex-col">
            {item.description && <div className="p-6">{item.description}</div>}
            <div className="p-6 bg-[#414141] flex justify-between items-center">
              <p className="text-white">{t("Module content")}</p>
              <div>{calcProgress(item.items)}</div>
            </div>
            <div className="p-4">
              {item.items.map((_t, i) => (
                <div onClick={() => selectCourseItem(_t)} className={`p-4 pl-6 cursor-pointer flex items-center ${i < item.items.length - 1 ? "border-b border-[#969696]" : ""}`}>
                  {progress.length > 0 && progress.filter((p) => p.id_course_topic === _t.id || p.id_course_test === _t.id).length > 0 ? (
                    <div className={`w-6.25 h-6.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center`}>
                      <RxCheck className="text-white" />
                    </div>
                  ) : (
                    <div className={`w-6.25 h-6.25 rounded-full bg-white border border-[#2F8351]`}></div>
                  )}
                  <p className="text-[14px] ml-2">{_t.title}</p>
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
            <div className="mr-2">{panelProps.isActive ? <p className="font-bold text-[14px]">{t("Collapase")}</p> : <p className="font-bold text-[14px]">{t("Expand")}</p>}</div>
            <div className="w-5 h-5 rounded-full bg-[#FFC600] flex justify-center items-center mr-2">
              {panelProps.isActive ? <RxChevronUp className="w-3.75 h-3.75 text-white" /> : <RxChevronDown className="w-3.75 h-3.75 text-white" />}
            </div>
          </div>
        );
      }}
    />
  );
}
