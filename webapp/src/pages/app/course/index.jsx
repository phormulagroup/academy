import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Button, Collapse, Divider, Progress } from "antd";
import { FaRegUser } from "react-icons/fa";
import { useContext } from "react";
import { FaChevronRight, FaRegCheckCircle, FaRegCopy, FaRegEdit, FaRegFile, FaRegTimesCircle, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../../components/table";
import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AiOutlineArrowDown, AiOutlineArrowUp, AiOutlineCheck } from "react-icons/ai";
import { useTranslation } from "react-i18next";

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

export default function CourseDetails() {
  const { user, setSelectedCourse } = useContext(Context);
  const [data, setData] = useState([]);

  let { slug } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) getData();
  }, [user]);

  async function getData() {
    try {
      const res = await axios.get(endpoints.course.readByLang, { params: { id_user: user.id, id_lang: user.id_lang } });
      let auxData = [];
      for (let c = 0; c < res.data.courses.length; c++) {
        let auxObj = {
          course: res.data.courses[c],
        };
        if (res.data.progress.length > 0) auxObj.progress = res.data.progress.filter((p) => p.id_course === res.data.courses[c].id);
        if (res.data.modules.length > 0) {
          let auxModules = res.data.modules.filter((m) => m.id_course === res.data.courses[c].id);
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
        auxObj.course.settings = auxObj.course.settings ? JSON.parse(auxObj.course.settings) : null;

        auxData.push(auxObj);
      }
      console.log(auxData);
      setData(auxData);
    } catch (err) {
      console.log(err);
    }
  }

  function calcProgress(items, modules) {
    if (items && items.length > 0) {
      let steps = modules.map((m) => m.items.length).reduce((a, b) => a + b, 0);
      let completed = items.filter((p) => p.is_completed === 1 && p.activity_type !== "module").length;

      let progressPercentage = (100 * completed) / steps;
      return progressPercentage;
    }
    return 0;
  }

  function downloadCertificate(item) {
    console.log(item);
    axios
      .get(endpoints.course_certificate.readById, { params: { id: item.id_course_certificate } })
      .then((res) => {
        console.log(res.data);
        certificate.generate({
          background: `${config.server_ip}/media/${res.data[0].background}`,
          text: res.data[0].text,
          fileName: `${item.name}-${user.name.replace(/\s+/g, "-")}.pdf`,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }

  return (
    <div className="bg-[#FFFFFF] relative">
      <div className="container mx-auto p-6 grid grid-cols-3 gap-10 mt-10">
        <div className="col-span-3 flex flex-col justify-center items-center mb-10">
          <p className="text-[30px] font-bold">{t("Online Courses - Bial Academy")}</p>
          <p className="italic">Keeping training in mind</p>
        </div>
        {data.length > 0 ? (
          data.map((item) => (
            <div className="shadow-[0px_3px_6px_#00000029]">
              <div
                className={`h-75 bg-center bg-cover bg-no-repeat p-6 flex justify-start items-end bg-black relative`}
                style={{ backgroundImage: item.course?.thumbnail ? `url(${config.server_ip}/media/${item.course?.thumbnail})` : "none" }}
              >
                <div className="p-[8px_20px_8px_20px] bg-white rounded-[40px]">
                  <p className="font-bold text-[18px]">{item.course?.name}</p>
                </div>
                {calcProgress(item.progress, item.modules) === 100 && (
                  <div className="absolute -bottom-4 right-4 rounded-[40px] flex items-center">
                    <CertificateIconWhite className="w-[80px] h-[80px]" />
                  </div>
                )}
              </div>
              <div className="bg-[#F7F7F7] p-4">
                <div className="flex items-center">
                  <Avatar src={avatarImg} className="w-12.5! h-12.5!" />
                  <div className="ml-2">
                    <p className="text-[14px]">{item.course?.responsible_name ?? "Claúdia Meneses"}</p>
                    <p className="text-[11px] text-[#707070]">
                      {item.course?.responsible_job ?? "Marketing Manager"}, {item.course?.responsible_country ?? "África"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 mb-4 flex flex-col justify-center items-center">
                  {calcProgress(item.progress, item.modules) === 100 ? (
                    <>
                      <div className="flex items-center justify-between w-full mb-2 min-h-[33px]">
                        <p className="uppercase">
                          {calcProgress(item.progress, item.modules)}% {t("completed")}
                        </p>
                        <Button className="certificate-button" onClick={() => downloadCertificate(item.course)}>
                          <div className="flex justify-center items-center">
                            <DownloadCloudIcon className="mr-2" />
                            {t("Certificate")}
                          </div>
                        </Button>
                      </div>
                      <Progress percent={calcProgress(item.progress, item.modules)} showInfo={false} strokeColor="#2F8351" railColor="#EAEAEA" />
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center w-full mb-2 min-h-[33px]">
                        <p className="mb-2 uppercase">
                          {calcProgress(item.progress, item.modules)}% {t("completed")}
                        </p>
                      </div>
                      <Progress percent={calcProgress(item.progress, item.modules)} showInfo={false} strokeColor="#2F8351" railColor="#EAEAEA" />
                    </>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {item.course.id_course_certificate && (
                    <div className="flex items-center">
                      <CertificateIcon className="mr-1" />
                      <p className="text-[16px]">{t("With certificate")}</p>
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
              <div className="p-4 flex justify-center items-center">
                <Link to={`/${i18n.language}/courses/${item.course.slug}`} className="w-full!">
                  <Button size="large" type="primary" className="w-full!">
                    {calcProgress(item.progress, item.modules) === 0 ? "Iniciar" : calcProgress(item.progress, item.modules) === 100 ? "Rever" : "Entrar"}
                  </Button>
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 flex flex-col justify-center items-center">
            <p>{t("No courses enrolled yet")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
