import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Button, Collapse, Divider, Progress } from "antd";
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

export default function CourseDetails() {
  const { user, setSelectedCourse } = useContext(Context);
  const [data, setData] = useState({});
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState([]);

  let { slug } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    getData();
  }, []);

  async function getData() {
    try {
      const res = await axios.get(endpoints.course.readBySlug, { params: { slug, id_user: user.id } });
      console.log(res);
      if (res.data.course.length > 0) {
        setData({ course: res.data.course[0], modules: res.data.modules, topics: res.data.topics, tests: res.data.tests });

        if (res.data.modules.length > 0) {
          let auxModules = res.data.modules;
          let newModules = [];
          for (let i = 0; i < auxModules.length; i++) {
            auxModules[i].items = auxModules[i].items ? JSON.parse(auxModules[i].items) : null;
            if (auxModules[i].items) {
              for (let y = 0; y < auxModules[i].items.length; y++) {
                if (auxModules[i].items[y].type === "topic")
                  auxModules[i].items[y] = { type: auxModules[i].items[y].type, ...res.data.topics.filter((_t) => _t.id === auxModules[i].items[y].id)[0] };
                if (auxModules[i].items[y].type === "test")
                  auxModules[i].items[y] = { type: auxModules[i].items[y].type, ...res.data.tests.filter((_t) => _t.id === auxModules[i].items[y].id)[0] };
              }
              newModules.push(auxModules[i]);
            }
          }

          setModules(newModules);
          setProgress(res.data.progress);
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  function calcProgress(items) {
    console.log(items);
    if (items && items.length > 0) {
      let completed = (progress ?? []).filter((p) => p.is_completed === 1 && items[0].id_course_module === p.id_course_module && p.activity_type !== "module").length;

      let progressPercentage = (100 * completed) / items.length;
      return (
        <p className="text-white">
          <span className="font-bold uppercase">
            {progressPercentage}% {t("Completed")}
          </span>
          | {completed}/{items.length} {t("Steps")}
        </p>
      );
    }
    return <p></p>;
  }

  return (
    <div className="bg-[#FFFFFF] relative">
      <div className="container m-auto grid grid-cols-3 mb-6 min-h-150 z-10">
        <div className="flex flex-col pt-[20%]">
          <p>{t("Course")}</p>
          <p className="text-[30px] font-bold text-black">{data.course?.name}</p>
          <div className="bg-[#EAEAEA] flex flex-col p-5 mt-4">
            <div className="flex items-center">
              <Avatar className="w-10! h-10!" />
              <div className="ml-2">
                <p className="text-black font-semibold">Cláudia Meneses</p>
                <p className="text-[#414141] text-[12px]">Cláudia Meneses</p>
              </div>
            </div>
            <Divider variant="dashed" className="mt-6! mb-6!" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-8 max-h-150 absolute top-0 right-0">
        <div className="col-span-3"></div>
        <div className="col-span-5 pl-10 flex justify-center items-center">
          <img src={`${config.server_ip}/media/${data.course?.img}`} className="h-full!" />
        </div>
      </div>
      <div className="container m-auto">
        <div className="bg-[#000000] p-6 flex gap-16 mb-5">
          <div className="p-2"></div>
          <div className="p-2 pl-6 border-l border-l-white flex flex-col w-full">
            <div className="flex justify-between items-center mb-2">
              <p className="text-white text-[20px] font-bold uppercase">
                {(100 * progress.filter((p) => p.is_completed === 1 && p.activity_type !== "module").length) / (data?.topics?.length + data?.tests?.length)}% {t("Completed")}
              </p>
              <p className="text-white text-[16px]">
                {t("Last activity at")} {progress[progress.length - 1] ? dayjs(progress[progress.length - 1].created_at).format("DD/MM/YYYY HH:mm") : ""}
              </p>
            </div>
            <Progress
              strokeColor={"#2F8351"}
              percent={(100 * progress.filter((p) => p.is_completed === 1 && p.activity_type !== "module").length) / (data?.topics?.length + data?.tests?.length)}
              className="w-full!"
              showInfo={false}
            />
          </div>
          <div className="p-2">
            <Button className="min-w-50" onClick={() => navigate(`/course/${slug}/learning`)}>
              {t("Enter")}
            </Button>
          </div>
        </div>
        <div className="flex flex-col">
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
                      <div
                        onClick={() => selectCourseItem(_t)}
                        className={`p-4 pl-6 cursor-pointer flex items-center ${i < item.items.length - 1 ? "border-b border-[#969696]" : ""}`}
                      >
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
                  <div className="mr-2">
                    {panelProps.isActive ? <p className="font-bold text-[14px]">{t("Collapase")}</p> : <p className="font-bold text-[14px]">{t("Expand")}</p>}
                  </div>
                  <div className="w-5 h-5 rounded-full bg-[#FFC600] flex justify-center items-center mr-2">
                    {panelProps.isActive ? <RxChevronUp className="w-3.75 h-3.75 text-white" /> : <RxChevronDown className="w-3.75 h-3.75 text-white" />}
                  </div>
                </div>
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}
