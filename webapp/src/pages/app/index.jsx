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

  useEffect(() => {
    console.log(courses);
  }, [courses]);

  return (
    <div className="p-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"></div>
      </div>
    </div>
  );
}
