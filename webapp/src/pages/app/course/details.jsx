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
import CourseContent from "./content";

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
        res.data.course[0].settings = res.data.course[0].settings ? JSON.parse(res.data.course[0].settings) : null;
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

  function calcCourseProgress(a, b, c) {
    let progressPercentage = (100 * a) / (b + c);
    const isInteger = progressPercentage % 1 === 0;
    return !isInteger ? (Math.round(progressPercentage * 100) / 100).toFixed(2) : progressPercentage;
  }

  return (
    <div className="bg-[#FFFFFF] relative">
      <div className="container m-auto grid grid-cols-3 mb-6 min-h-150 z-10 absolute top-0 left-0 right-0">
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
            <div className="grid grid-cols-2 gap-4">
              {data.course?.id_course_certificate && (
                <div className="flex items-center">
                  <CertificateIcon className="mr-1" />
                  <p className="text-[16px]">{t("With certificate")}</p>
                </div>
              )}
              {(data.course?.settings?.duration_hours || data.course?.settings?.duration_minutes) && (
                <div className="flex items-center">
                  <DurationIcon className="mr-1" />
                  <p className="text-[16px]">
                    {data.course.settings.duration_hours} h {data.course.settings.duration_minutes ? `${data.course.settings.duration_minutes}m` : ""}
                  </p>
                </div>
              )}
              {data.course?.settings?.video && (
                <div className="flex items-center">
                  <VideosIcon className="mr-1" />
                  <p className="text-[16px]">{data.course.settings.video} videos</p>
                </div>
              )}
              {data.course?.settings?.trainer && (
                <div className="flex items-center">
                  <TrainerIcon className="mr-1" />
                  <p className="text-[16px]">{data.course.settings.trainer}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-8 max-h-150">
        <div className="col-span-3"></div>
        <div className="col-span-5 pl-10 flex justify-center items-center">
          <img src={`${config.server_ip}/media/${data.course?.img}`} className="h-full!" />
        </div>
      </div>
      <div className="container m-auto -mt-10 relative z-10">
        <div className="bg-[#000000] p-6 flex gap-8 mb-5">
          <div className="p-2 pr-0">
            <FlagIcon className="max-w-12.5" />
          </div>
          <div className="p-2 pl-6 border-l border-l-white flex flex-col w-full">
            <div className="flex items-center justify-start mb-2">
              <p className="text-white text-[20px] font-bold uppercase">
                {calcCourseProgress(
                  progress.filter((p) => p.is_completed === 1 && p.activity_type !== "module" && p.activity_type !== "course").length,
                  data?.topics?.length,
                  data?.tests?.length,
                )}
                % {t("Completed")}
              </p>
              <p className="text-white text-[16px] ml-4">
                {t("Last activity at")} {progress[progress.length - 1] ? dayjs(progress[progress.length - 1].created_at).format("DD/MM/YYYY HH:mm") : ""}
              </p>
            </div>
            <Progress
              strokeColor={"#2F8351"}
              railColor={"#FFF"}
              percent={
                (100 * progress.filter((p) => p.is_completed === 1 && p.activity_type !== "module" && p.activity_type !== "course").length) /
                (data?.topics?.length + data?.tests?.length)
              }
              className="w-full!"
              showInfo={false}
            />
          </div>
          <div className="p-2 flex justify-center items-center">
            {calcCourseProgress(
              progress.filter((p) => p.is_completed === 1 && p.activity_type !== "module" && p.activity_type !== "course").length,
              data?.topics?.length,
              data?.tests?.length,
            ) === 100 ? (
              <Button className="min-w-50" color="blue" variant="solid" size="large" onClick={() => navigate(`/${i18n.language}/courses/${slug}/learning`)}>
                {t("Review")}
              </Button>
            ) : (
              <Button className="min-w-50" color="black" variant="solid" size="large" onClick={() => navigate(`/${i18n.language}/courses/${slug}/learning`)}>
                {t("Enter")}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container m-auto">
        <Tabs
          defaultActiveKey="1"
          items={[
            { key: "1", label: "Tab 1", children: <CourseContent modules={modules} progress={progress} data={data} /> },
            { key: "2", label: "Tab 2", children: "Content of Tab Pane 2" },
            { key: "3", label: "Tab 3", children: "Content of Tab Pane 3" },
          ]}
          onChange={(key) => console.log(key)}
          indicator={{ size: (origin) => origin - 20, align: "center" }}
        />
      </div>
      <div className="flex w-full bg-[#F7F7F7]">
        <div className="container m-auto">
          <div className="flex flex-col"></div>
        </div>
      </div>
    </div>
  );
}
