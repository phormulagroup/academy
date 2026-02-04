import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Collapse, Divider } from "antd";
import { FaRegUser } from "react-icons/fa";
import { useContext } from "react";
import { FaChevronRight, FaRegCheckCircle, FaRegCopy, FaRegEdit, FaRegFile, FaRegTimesCircle, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/table";
import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";

export default function Main() {
  const { user } = useContext(Context);
  const [data, setData] = useState(0);
  const [myProjects, setMyProjects] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    axios
      .get(endpoints.dashboard.read)
      .then((res) => {
        console.log(res);
        setData(res.data);
        setTableLoading(false);
      })
      .catch((err) => {
        console.log(err);
      });
  }

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
      </div>
    </div>
  );
}
