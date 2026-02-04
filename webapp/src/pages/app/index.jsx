import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Button, Collapse, Divider } from "antd";
import { FaRegUser } from "react-icons/fa";
import { useContext } from "react";
import { FaChevronRight, FaRegCheckCircle, FaRegCopy, FaRegEdit, FaRegFile, FaRegTimesCircle, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/table";
import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { useNavigate } from "react-router-dom";

export default function Main() {
  const { user, courses } = useContext(Context);

  const navigate = useNavigate();

  return (
    <div className="p-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex justify-between items-center p-4 bg-[#FFF] rounded-md shadow-md col-span-2">
          <div className="flex justify-center items-center">
            <Avatar className="w-20! h-20!" icon={<FaRegUser className="w-10! h-10!" />} />
            <div className="ml-4">
              <p>Olá,</p>
              <p className="text-[18px] font-semibold">{user.name}</p>
            </div>
          </div>
        </div>

        <div className="col-span-2">
          {courses.map((item) => (
            <div>
              <p>{item.name}</p>
              <Button onClick={() => navigate(`/course/${item.slug}`)}></Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
