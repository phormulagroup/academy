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

export default function Card({ user, courses }) {
  const { t } = useTranslation();

  const location = useLocation();

  return (
    <div className="bg-white p-10 flex flex-col items-center">
      <p className="text-[26px] font-bold text-center">{user.name}</p>
      {user.job && <p>{user.job}</p>}
      <Avatar src={avatarImg} className="w-40! h-40! mt-4! mb-4!" />
      <p>ID</p>
      <p className="text-[25px]">{user.id}</p>
      <div className="flex justify-center items-center gap-4 mt-10!">
        <div className="flex flex-col justify-start items-center">
          <p className="text-[40px] font-bold text-center">{courses.length}</p>
          <p className="text-[#707C87] text-sm text-center">{t("Course(s)")}</p>
        </div>
        <Divider orientation="vertical" className="m-0! h-full!" />
        <div className="flex flex-col justify-start items-center">
          <p className="text-[40px] font-bold text-center">{courses.length}</p>
          <p className="text-[#707C87] text-sm text-center">{t("Completed")}</p>
        </div>
        <Divider orientation="vertical" className="m-0!  h-full!" />
        <div className="flex flex-col justify-start items-center">
          <p className="text-[40px] font-bold text-center">{courses.length}</p>
          <p className="text-[#707C87] text-sm text-center">{t("Certificate(s)")}</p>
        </div>
      </div>
    </div>
  );
}
