import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Button, Collapse, Divider, Progress } from "antd";
import { FaRegUser } from "react-icons/fa";
import { useContext } from "react";
import { FaChevronRight, FaRegCheckCircle, FaRegCopy, FaRegEdit, FaRegFile, FaRegTimesCircle, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../../components/admin/table";
import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AiOutlineArrowDown, AiOutlineArrowUp, AiOutlineCheck } from "react-icons/ai";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import Lottie from "lottie-react";

import avatarImg from "../../../assets/Female.svg";
import config from "../../../utils/config";
import DurationIcon from "../../../assets/Duracao.svg?react";
import CertificateIcon from "../../../assets/Certificado.svg?react";
import TrainerIcon from "../../../assets/Formador.svg?react";
import VideosIcon from "../../../assets/Videos.svg?react";
import CertificateIconWhite from "../../../assets/Certificado-digital.svg?react";
import DownloadCloudIcon from "../../../assets/download-cloud.svg?react";
import i18n from "../../../utils/i18n";
import certificate from "../../../utils/certificate";
import trailLoadingAnimation from "../../../assets/Trail-loading.json";
import { GridIcon, ListIcon } from "lucide-react";
import Countdown from "../../../components/countdown";

export default function CourseDetails() {
  const { user, languages, windowDimension } = useContext(Context);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewType, setViewType] = useState("grid");

  let { slug } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) getData();
  }, [user, i18n.language]);

  useEffect(() => {
    if (windowDimension < 1080) setViewType("grid");
  }, [windowDimension]);

  async function getData() {
    try {
      const res = await axios.get(endpoints.course.readByLang, {
        params: { id_user: user.id, id_lang: user.id_role === 1 ? languages.filter((_l) => _l.code === i18n.language)[0].id : user.id_lang },
      });
      let auxData = [];
      for (let c = 0; c < res.data.courses.length; c++) {
        let auxCourse = res.data.courses[c];
        if (auxCourse.status === "draft" && user.id_role !== 1) continue;
        auxCourse.settings = auxCourse.settings ? JSON.parse(auxCourse.settings) : null;
        if (!canAccess(auxCourse)) continue;

        if (user.id_role !== 1 && auxCourse.settings.country_limit && auxCourse.settings.country && !auxCourse.settings.country.includes(user.country)) auxCourse = null;

        if (auxCourse) {
          let auxObj = {
            course: auxCourse,
          };
          if (res.data.progress.length > 0) auxObj.progress = res.data.progress.filter((p) => p.id_course === auxCourse.id);
          if (res.data.modules.length > 0) {
            let auxModules = res.data.modules.filter((m) => m.id_course === auxCourse.id);
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

            auxObj.modules = newModules;
          }

          auxData.push(auxObj);
        }
      }

      setData(auxData);
      setTimeout(() => {
        setIsLoading(false);
      }, 1500);
    } catch (err) {
      console.log(err);
    }
  }

  function canAccess(obj) {
    let settings = obj.settings;
    if (user.id_role === 1) return true;
    if (settings.course_access_expiration) {
      let today = dayjs();
      if (today.diff(dayjs(settings.course_access_expiration_dates.start_date).diff(today)) > 0 && today.diff(dayjs(settings.course_access_expiration_dates.end_date)) < 0) {
        return true;
      } else {
        return false;
      }
    } else return true;
  }

  function calcProgress(items, modules) {
    if (items && items.length > 0) {
      let steps = modules.map((m) => m.items.length).reduce((a, b) => a + b, 0);
      let completed = items.filter((p) => p.is_completed === 1 && p.activity_type !== "module" && p.activity_type !== "course" && p.activity_type !== "enroll").length;

      let progressPercentage = (100 * completed) / steps;
      return progressPercentage === 100 ? 100 : parseFloat(progressPercentage).toFixed(2);
    }
    return 0;
  }

  function downloadCertificate(item, progress) {
    axios
      .get(endpoints.course_certificate.readById, { params: { id: item.id_course_certificate } })
      .then((res) => {
        certificate.generate(
          {
            background: `${config.server_ip}/media/${res.data[0].background}`,
            text: res.data[0].text,
            fileName: `${item.name}-${user.name.replace(/\s+/g, "-")}.pdf`,
          },
          {
            name: user.name,
            course: item.name,
            date:
              progress.filter((p) => p.id_course === item.id && p.activity_type === "course").length > 0
                ? dayjs(progress.filter((p) => p.id_course === item.id && p.activity_type === "course")[0]?.created_at).format("YYYY-MM-DD HH:mm")
                : null,
          },
        );
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function updateCourseAvailable(obj) {
    setData((prev) => prev.map((item) => (item.course.id === obj.id ? { ...item, is_available: true } : obj)));
  }

  return (
    <div className="bg-[#FFFFFF] relative">
      <div className="container mx-auto p-6 mt-10">
        <div className="col-span-3 flex flex-col justify-center items-center mb-10">
          <p className="text-[30px] font-bold text-center">{t("Online Courses - Bial Academy")}</p>
          <p className="italic text-center">Keeping training in mind</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center w-full h-full col-span-3">
            <Lottie animationData={trailLoadingAnimation} loop={true} className="max-w-30" />
          </div>
        ) : data.length > 0 ? (
          <div className={`grid ${viewType === "list" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"} gap-0 gap-y-8 sm:gap-8`}>
            <div className="col-span-3 flex justify-end items-center gap-4 mb-4">
              <GridIcon className="cursor-pointer" onClick={() => setViewType("grid")} />
              <ListIcon className="cursor-pointer" onClick={() => setViewType("list")} />
            </div>
            {data.map((item) => (
              <div
                className={`shadow-[0px_3px_6px_#00000029] rounded-[5px] ${viewType === "list" ? "flex" : "flex flex-col"} ${viewType === "list" ? "col-span-3" : "col-span-1"}`}
              >
                <div
                  className={`${viewType === "grid" ? "h-75" : "h-full w-50"} bg-center bg-cover bg-no-repeat p-6 flex justify-start items-end bg-black relative rounded-tl-[5px] rounded-tr-[5px]`}
                  style={{ backgroundImage: item.course?.thumbnail ? `url(${config.server_ip}/media/${item.course?.thumbnail})` : "none" }}
                >
                  <div className="p-[8px_20px_8px_20px] bg-white rounded-[40px]">
                    <p className={`font-bold ${viewType === "list" ? "text-[14px]" : "text-[18px]"}`}>{item.course?.name}</p>
                  </div>
                  {viewType === "grid" && calcProgress(item.progress, item.modules) === 100 && (
                    <div className="absolute -bottom-4 right-4 rounded-[40px] flex items-center">
                      <CertificateIconWhite className="w-20 h-20" />
                    </div>
                  )}
                </div>
                <div className={`w-full ${viewType === "list" ? "grid grid-cols-5" : "flex-col"}`}>
                  <div className={`bg-[#F7F7F7] p-6 ${viewType === "list" ? "col-span-4 grid grid-cols-3 gap-10" : "col-span-1"}`}>
                    <div className="flex flex-col">
                      {item.course.settings?.id_trainer && (
                        <div className="flex items-center mb-4">
                          <Avatar src={avatarImg} className="w-12.5! h-12.5!" />
                          <div className="ml-2">
                            <p className="text-sm">{item.course?.responsible_name ?? "Claúdia Meneses"}</p>
                            <p className="text-[11px] text-[#707070]">
                              {item.course?.responsible_job ?? "Marketing Manager"}, {item.course?.responsible_country ?? "África"}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className={`${item.course.settings?.id_trainer ? "mt-4" : "mt-0"} mb-4 flex flex-col justify-center items-center`}>
                        {calcProgress(item.progress, item.modules) === 100 ? (
                          <>
                            <div className="flex items-center justify-between w-full mb-2 min-h-8.25">
                              <p className="uppercase">
                                {calcProgress(item.progress, item.modules)}% {t("completed")}
                              </p>
                              <Button className="certificate-button" onClick={() => downloadCertificate(item.course, item.progress)}>
                                <div className="flex justify-center items-center">
                                  <DownloadCloudIcon className="mr-2" />
                                  {t("Certificate")}
                                </div>
                              </Button>
                            </div>
                            <Progress percent={calcProgress(item.progress, item.modules)} showInfo={false} strokeColor="#2F8351" railColor="#EAEAEA" />
                          </>
                        ) : (
                          <div className="flex flex-col w-full mb-2 min-h-10">
                            {item.progress?.length > 0 ? (
                              <>
                                <div className="flex items-center justify-center w-full mb-1">
                                  <p className="uppercase">
                                    {calcProgress(item.progress, item.modules)}% {t("completed")}
                                  </p>
                                </div>
                                <Progress percent={calcProgress(item.progress, item.modules)} showInfo={false} strokeColor="#2F8351" railColor="#EAEAEA" />
                              </>
                            ) : (
                              <div className="flex items-center justify-center w-full mb-1">
                                <p>{t("Not enrolled")}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`col-span-2 grid ${viewType === "list" ? "grid-cols-4" : "grid-cols-2"} gap-4`}>
                      {item.course.id_course_certificate && (
                        <div className="flex items-center">
                          <CertificateIcon className="mr-1" />
                          <p className="text-[16px]">{t("Certificate")}</p>
                        </div>
                      )}
                      {(item.course.settings?.duration_hours || item.course.settings?.duration_minutes) && (
                        <div className="flex items-center">
                          <DurationIcon className="mr-1" />
                          <p className="text-[16px]">
                            {item.course.settings.duration_hours} h {item.course.settings.duration_minutes ? `${item.course.settings.duration_minutes}m` : ""}
                          </p>
                        </div>
                      )}
                      {item.course.settings?.video && (
                        <div className="flex items-center">
                          <VideosIcon className="mr-1" />
                          <p className="text-[16px]">{item.course.settings.video} videos</p>
                        </div>
                      )}
                      {item.course.settings?.trainer && (
                        <div className="flex items-center">
                          <TrainerIcon className="mr-1" />
                          <p className="text-[16px]">{item.course.settings.trainer}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-8 flex justify-center items-center">
                    {canAccess(item.course) || item.is_available ? (
                      <Link to={`/${i18n.language}/courses/${item.course.slug}`} className="w-full!">
                        {calcProgress(item.progress, item.modules) === 100 ? (
                          <Button size="large" color="blue" variant="solid" className="w-full!">
                            Rever
                          </Button>
                        ) : (
                          <Button size="large" type="primary" className="w-full!">
                            {calcProgress(item.progress, item.modules) === 0 ? "Iniciar" : "Entrar"}
                          </Button>
                        )}
                      </Link>
                    ) : (
                      <div className="flex flex-col justify-center items-center">
                        <p className="font-bold">{t("Available in")}</p>
                        <Countdown
                          targetDate={item.course.settings.course_access_expiration_dates.start_date}
                          className="text-[20px]"
                          countdownType="course"
                          updateCourseAvailable={() => updateCourseAvailable(item.course)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="col-span-3 flex flex-col justify-center items-center">
            <p>{t("No courses available")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
