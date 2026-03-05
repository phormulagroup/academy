import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Button, Divider, Empty, Progress, Tabs } from "antd";
import { useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";

import CourseContent from "./content";
import CourseMaterial from "./material";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import config from "../../../utils/config";

import DurationIcon from "../../../assets/Duracao.svg?react";
import CertificateIcon from "../../../assets/Certificado.svg?react";
import TrainerIcon from "../../../assets/Formador.svg?react";
import VideosIcon from "../../../assets/Videos.svg?react";
import FlagIcon from "../../../assets/Flag.svg?react";
import i18n from "../../../utils/i18n";
import CourseIcon from "../../../assets/Curso.svg?react";
import MaterialIcon from "../../../assets/Materiais.svg?react";
import trailLoadingAnimation from "../../../assets/Trail-loading.json";
import Lottie from "lottie-react";

export default function CourseDetails() {
  const { user, languages } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
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
      const res = await axios.get(endpoints.course.readBySlug, { params: { slug, id_user: user.id, id_lang: languages.filter((_l) => _l.code === i18n.language)[0].id } });
      if (res.data.course.length > 0) {
        res.data.course[0].settings = res.data.course[0].settings ? JSON.parse(res.data.course[0].settings) : null;
        res.data.course[0].material = res.data.course[0].material ? JSON.parse(res.data.course[0].material) : null;
        res.data.course[0].objection = res.data.course[0].objection ? JSON.parse(res.data.course[0].objection) : null;
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
      } else {
        navigate(`/${i18n.language}/courses`, { replace: true });
      }
      setTimeout(() => {
        setIsLoading(false);
      }, 1500);
    } catch (err) {
      console.log(err);
    }
  }

  function calcCourseProgress(a, b, c) {
    let progressPercentage = (100 * a) / (b + c);
    const isInteger = progressPercentage % 1 === 0;
    return !isInteger ? (Math.round(progressPercentage * 100) / 100).toFixed(2) : progressPercentage;
  }

  function enroll() {
    setIsEnrolling(true);
    let auxData = [
      {
        id_course: data.course.id,
        id_user: user.id,
        activity_type: "enroll",
        is_completed: 1,
        created_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        modified_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      },
    ];

    axios
      .post(endpoints.course.updateProgress, {
        data: auxData,
      })
      .then((res) => {
        console.log(res);
        setIsEnrolling(false);
        navigate(`/${i18n.language}/courses/${slug}/learning`);
      })
      .catch((err) => {
        console.log(err);
        setIsEnrolling(false);
      });
  }

  return (
    <div className="bg-[#FFFFFF] relative">
      {isLoading ? (
        <div className="flex justify-center items-center w-full min-h-75 col-span-3">
          <Lottie animationData={trailLoadingAnimation} loop={true} className="max-w-30" />
        </div>
      ) : data.course ? (
        <div>
          <div className="container m-auto grid grid-cols-3 mb-0 sm:mb-6 sm:min-h-150 z-10 xl:absolute top-0 left-0 right-0">
            <div className="flex flex-col xl:pt-[10%] col-span-3 xl:col-span-1">
              <div className="pt-6 xl:p-0 flex justify-between p-6">
                <div>
                  <p>{t("Course")}</p>
                  <p className="text-[30px] font-bold text-black">{data.course?.name}</p>
                </div>
                <div className="flex lg:hidden justify-center items-center" onClick={() => navigate(`/${i18n.language}/courses`)}>
                  <p>{t("Go back")}</p>
                </div>
              </div>
              <div className="flex xl:hidden justify-center items-center">
                <img src={`${config.server_ip}/media/${data.course?.img}`} className="h-full!" />
              </div>
              <div className="bg-black sm:bg-transparent p-6 sm:p-0">
                <div className="bg-[#EAEAEA] flex flex-col p-5 mt-0 lg:mt-4">
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
                      <div className="flex items-center col-span-2 sm:col-span-1">
                        <CertificateIcon className="mr-1" />
                        <p className="text-[16px]">{t("With certificate")}</p>
                      </div>
                    )}
                    {(data.course?.settings?.duration_hours || data.course?.settings?.duration_minutes) && (
                      <div className="flex items-center col-span-2 sm:col-span-1">
                        <DurationIcon className="mr-1" />
                        <p className="text-[16px]">
                          {data.course.settings.duration_hours} h {data.course.settings.duration_minutes ? `${data.course.settings.duration_minutes}m` : ""}
                        </p>
                      </div>
                    )}
                    {data.course?.settings?.video && (
                      <div className="flex items-center col-span-2 sm:col-span-1">
                        <VideosIcon className="mr-1" />
                        <p className="text-[16px]">{data.course.settings.video} videos</p>
                      </div>
                    )}
                    {data.course?.settings?.trainer && (
                      <div className="flex items-center col-span-2 sm:col-span-1">
                        <TrainerIcon className="mr-1" />
                        <p className="text-[16px]">{data.course.settings.trainer}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden xl:grid grid-cols-8 max-h-150">
            <div className="col-span-3"></div>
            <div className="col-span-5 pl-10 flex justify-center items-center">
              <img src={`${config.server_ip}/media/${data.course?.img}`} className="h-full!" />
            </div>
          </div>
          <div className="container m-auto xl:-mt-10 relative z-10">
            <div className="bg-[#000000] p-6 flex flex-col sm:flex-row gap-8 mb-5">
              <div className="hidden sm:flex p-2 pr-0">
                <FlagIcon className="max-w-12.5" />
              </div>
              <div className="p-2 sm:pl-6 border-0 sm:border-l border-l-white flex flex-col w-full">
                <div className="flex flex-col sm:flex-row items-center justify-start mb-2">
                  <p className="text-white text-[20px] font-bold uppercase">
                    {calcCourseProgress(
                      progress.filter((p) => p.is_completed === 1 && p.activity_type !== "module" && p.activity_type !== "course" && p.activity_type !== "enroll").length,
                      data?.topics?.length,
                      data?.tests?.length,
                    )}
                    % {t("Completed")}
                  </p>
                  <p className="text-white text-sm ml-4">
                    {t("Last activity at")} {progress[progress.length - 1] ? dayjs(progress[progress.length - 1].created_at).format("DD/MM/YYYY HH:mm") : ""}
                  </p>
                </div>
                <Progress
                  strokeColor={"#2F8351"}
                  railColor={"#FFF"}
                  percent={
                    (100 * progress.filter((p) => p.is_completed === 1 && p.activity_type !== "module" && p.activity_type !== "course" && p.activity_type !== "enroll").length) /
                    (data?.topics?.length + data?.tests?.length)
                  }
                  className="w-full!"
                  showInfo={false}
                />
              </div>
              <div className="p-2 flex justify-center items-center">
                {calcCourseProgress(
                  progress.filter((p) => p.is_completed === 1 && p.activity_type !== "module" && p.activity_type !== "course" && p.activity_type !== "enroll").length,
                  data?.topics?.length,
                  data?.tests?.length,
                ) === 100 ? (
                  <Button className="min-w-50" color="blue" variant="solid" size="large" onClick={() => navigate(`/${i18n.language}/courses/${slug}/learning`)}>
                    {t("Review")}
                  </Button>
                ) : progress.filter((p) => p.activity_type === "enroll").length === 0 ? (
                  <Button className="min-w-50" color="black" variant="solid" size="large" onClick={() => enroll()}>
                    {t("Initiate")}
                  </Button>
                ) : (
                  <Button className="min-w-50" color="black" variant="solid" size="large" onClick={() => navigate(`/${i18n.language}/courses/${slug}/learning`)}>
                    {t("Enter")}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="container m-auto p-2 sm:p-0">
            <Tabs
              defaultActiveKey="1"
              items={[
                {
                  key: "1",
                  label: (
                    <div className="flex p-2 justify-center items-center">
                      <CourseIcon className="w-5 h-5 sm:w-6.25 sm:h-6.25 mr-2" /> <p className="font-bold text-lg sm:text-[22px]">{t("Course")}</p>
                    </div>
                  ),
                  children: <CourseContent modules={modules} progress={progress} data={data} />,
                },
                {
                  key: "3",
                  label: (
                    <div className="flex p-2 justify-center items-center">
                      <MaterialIcon className="w-5 h-5 sm:w-6.25 sm:h-6.25 mr-2" /> <p className="font-bold text-lg sm:text-[22px]">{t("Materials")}</p>
                    </div>
                  ),
                  children: <CourseMaterial data={data.course} />,
                },
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
      ) : (
        <div>
          <Empty />
        </div>
      )}
    </div>
  );
}
