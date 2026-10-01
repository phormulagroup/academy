import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Button, Collapse, Divider } from "antd";
import { FaRegUser } from "react-icons/fa";
import { useContext } from "react";
import { FaChevronRight, FaRegCheckCircle, FaRegCopy, FaRegEdit, FaRegFile, FaRegTimesCircle, FaRegTrashAlt } from "react-icons/fa";

import { Context } from "../../../utils/context";

import { Link, useLocation, useNavigate } from "react-router-dom";
import avatarImg from "../../../assets/Female.svg";
import { useTranslation } from "react-i18next";
import i18n from "../../../utils/i18n";

export default function UserCard({ courses }) {
  const { user } = useContext(Context);

  const { t } = useTranslation();

  const location = useLocation();

  useEffect(() => {
    console.log(courses);
  }, [courses]);

  return (
    <div className="bg-white p-4 sm:p-6 lg:p-10 flex flex-col items-center">
      <p className="font-ryker text-[18px] sm:text-[22px] lg:text-[26px] font-bold text-center leading-tight">{user.name}</p>
      {user.job && <p>{user.job}</p>}
      <Avatar src={avatarImg} className="w-20! h-20! sm:w-28! sm:h-28! lg:w-40! lg:h-40! mt-3! mb-3! lg:mt-4! lg:mb-4!" />
      <Link to={`/${i18n.language}/account`}>
        <Button size="large" className={`mb-4 min-w-50 user-card-button ${location.pathname.includes("account") ? "selected" : ""}`}>
          <p className="font-bold text-[14px] lg:text-[16px]">{t("My account")}</p>
        </Button>
      </Link>
      <Link to={`/${i18n.language}/result`}>
        <Button size="large" className={`min-w-50 user-card-button ${location.pathname.includes("result") ? "selected" : ""}`}>
          <p className="font-bold text-[14px] lg:text-[16px]">{t("Results")}</p>
        </Button>
      </Link>

      {courses && (
        <div className="flex justify-center items-center gap-4 mt-6!">
          <div className="flex flex-col justify-start items-center">
            <p className="text-[22px] sm:text-[26px] lg:text-[30px] font-bold text-center">{courses.length}</p>
            <p className="text-[#707C87] text-[12px] text-center">{t("Course(s)")}</p>
          </div>
          <Divider orientation="vertical" className="m-0! h-full!" />
          <div className="flex flex-col justify-start items-center">
            <p className="text-[22px] sm:text-[26px] lg:text-[30px] font-bold text-center">
              {courses.length > 0 
                ? courses.filter((_c) => _c.progress?.some((_p) => _p.is_completed === 1 && _p.activity_type === "course" && _p.is_deleted === 0)).length 
                : 0}
            </p>
            <p className="text-[#707C87] text-[12px] text-center">{t("Completed")}</p>
          </div>
          <Divider orientation="vertical" className="m-0!  h-full!" />
          <div className="flex flex-col justify-start items-center">
            <p className="text-[22px] sm:text-[26px] lg:text-[30px] font-bold text-center">
              {courses.length > 0 
                ? courses.filter((_c) => _c.progress?.some((_p) => _p.is_completed === 1 && _p.activity_type === "course" && _p.is_deleted === 0)).length 
                : 0}
            </p>
            <p className="text-[#707C87] text-[12px] text-center">{t("Certificate(s)")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
