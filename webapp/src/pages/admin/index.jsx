import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Collapse, Divider, Progress, Table } from "antd";
import { FaCross, FaRegUser } from "react-icons/fa";
import { useContext } from "react";
import StudentsIcon from "../../assets/Backoffice/Total-Alunos.svg?react";
import CoursesIcon from "../../assets/Backoffice/Cursos.svg?react";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import UserIcon from "../../assets/Backoffice/User-small.svg?react";
import EmailIcon from "../../assets/Backoffice/Email-small.svg?react";
import { CheckCircle, CircleX } from "lucide-react";
import { AiOutlineCloseCircle } from "react-icons/ai";

export default function Main() {
  const { user, selectedLanguage } = useContext(Context);
  const [data, setData] = useState({});
  const [tableData, setTableData] = useState([]);

  const { t } = useTranslation();

  useEffect(() => {
    getData();
  }, [selectedLanguage]);

  function getData() {
    axios
      .get(endpoints.dashboard.read, {
        params: { id_lang: selectedLanguage.id },
      })
      .then((res) => {
        console.log(res);
        setData(res.data);
        prepareData(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function prepareData(obj) {
    let aux = [];
    const auxActivity = obj.activity;
    for (let i = 0; i < auxActivity.length; i++) {
      let percentageProgress = 0;
      let topics = obj.topics.filter((t) => t.id_course === auxActivity[i].id_course);
      let modules = obj.topics.filter((t) => t.id_module === auxActivity[i].id_module);
      let tests = obj.tests.filter((t) => t.id_course === auxActivity[i].id_course);
      let progressCompleted = auxActivity.filter(
        (a) =>
          auxActivity[i].activity_type !== "enroll" &&
          auxActivity[i].activity_type !== "course" &&
          a.id_user === auxActivity[i].id_user &&
          auxActivity[i].id_course === a.id_course,
      );
      if (auxActivity[i].activity_type !== "enroll" && auxActivity[i].is_completed === 1) {
        percentageProgress = calcCourseProgress(
          progressCompleted.slice(i, progressCompleted.length).length,
          topics.length + tests.length + modules.length,
          auxActivity[i].is_completed,
        );
      }

      aux.push({
        user: (
          <div className="flex flex-col">
            <div className="flex items-center">
              <UserIcon className="w-5 h-5 mr-1" />
              <p className="text-[12px]">{obj.users.filter((u) => u.id === auxActivity[i].id_user)[0].name}</p>
            </div>
            <div className="flex items-center mt-1">
              <EmailIcon className="w-5 h-5 mr-1" />
              <p className="text-[11px]">{obj.users.filter((u) => u.id === auxActivity[i].id_user)[0].email}</p>
            </div>
          </div>
        ),
        progress: (
          <div>
            <p className="text-[12px] font-bold">{obj.courses.filter((c) => c.id === auxActivity[i].id_course)[0].name}</p>
            {auxActivity[i].activity_type !== "enroll" && auxActivity[i].activity_type !== "course" && auxActivity[i].is_completed === 1 && (
              <Progress percent={percentageProgress} size="small" showInfo={percentageProgress === 100 ? false : true} />
            )}
            <p className="text-[12px] line-clamp-1">
              {auxActivity[i].activity_type === "test"
                ? obj.tests.filter((_t) => _t.id === auxActivity[i].id_course_test)[0].title
                : auxActivity[i].activity_type === "topic"
                  ? obj.topics.filter((_t) => _t.id === auxActivity[i].id_course_topic)[0].title
                  : auxActivity[i].activity_type === "module"
                    ? obj.modules.filter((_t) => _t.id === auxActivity[i].id_course_module)[0].title
                    : t(`${auxActivity[i].activity_type}`)}
            </p>
            {auxActivity[i].activity_type !== "enroll" && auxActivity[i].activity_type !== "course" && <p className="text-[10px]">{t(`${auxActivity[i].activity_type}`)}</p>}
          </div>
        ),
        status: auxActivity[i].is_completed ? <CheckCircle className="text-green-500 w-5 h-5" /> : <CircleX className="text-red-500 w-5 h-5" />,
        date: <p className="text-[12px]">{dayjs(auxActivity[i].created_at).format("DD MMMM, YYYY HH:mm")}</p>,
        fullData: {
          user_name: obj.users.filter((u) => u.id === auxActivity[i].id_user)[0].name,
          user_email: obj.users.filter((u) => u.id === auxActivity[i].id_user)[0].email,
          course: obj.courses.filter((c) => c.id === auxActivity[i].id_course)[0].name,
          is_completed: auxActivity[i].is_completed,
          date: auxActivity[i].created_at,
        },
      });
    }

    setTableData(aux);
  }

  function calcCourseProgress(a, b, is_completed) {
    if (a > 0) {
      let progressPercentage = (100 * (is_completed ? a : a - 1)) / b;
      const isInteger = progressPercentage % 1 === 0;
      return !isInteger ? (Math.round(progressPercentage * 100) / 100).toFixed(2) : progressPercentage;
    } else {
      return 0;
    }
  }

  return (
    <div className="p-2">
      <p className="text-[18px] font-bold mb-4">Overview e-Learning</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-center bg-[#FFF]">
            <div className="grid grid-cols-2 w-full">
              <div className="flex flex-col justify-center items-center border-l border-t border-b border-r border-[#C0C0C0] p-6 bg-[#EAEAEA]">
                <StudentsIcon className="w-17.5 h-17.5" />
                <p className="mt-4">{t("Total of students")}</p>
                <p className="mt-1 font-bold text-[30px]">{data.users?.length}</p>
              </div>
              <div className="flex flex-col justify-center items-center border-t border-b border-r border-[#C0C0C0] p-6">
                <CoursesIcon className="w-17.5 h-17.5" />
                <p className="mt-4">{t("Total of courses")}</p>
                <p className="mt-1 font-bold text-[30px] ">{data.courses?.length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col p-6 w-full bg-white border border-[#C0C0C0]">
          <p className="font-bold text-[16px] mb-4">{t("Activity")}</p>
          <Table
            dataSource={tableData}
            pagination={{
              pageSize: 5, // máximo 5 por página
              position: ["bottomCenter"], // paginação ao centro
            }}
            columns={[
              {
                title: t("User"),
                dataIndex: "user",
                key: "user",
                width: "300px",
              },
              {
                title: "Progress",
                dataIndex: "progress",
                key: "progress",
              },
              {
                title: "Satus",
                dataIndex: "status",
                key: "status",
                width: "80px",
              },
              {
                title: "Date",
                dataIndex: "date",
                key: "date",
                width: "170px",
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
