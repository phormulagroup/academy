import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Button, Collapse, Divider } from "antd";
import { FaRegUser } from "react-icons/fa";
import { useContext } from "react";
import { FaChevronRight, FaRegCheckCircle, FaRegCopy, FaRegEdit, FaRegFile, FaRegTimesCircle, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../../components/table";
import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useNavigate, useParams } from "react-router-dom";

export default function CourseDetails() {
  const { user, setSelectedCourse } = useContext(Context);
  const [data, setData] = useState(null);
  const [progress, setProgress] = useState(null);

  let { slug } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    getData();
  }, []);

  async function getData() {
    try {
      const res = await axios.get(endpoints.course.readBySlug, { params: { slug, id_user: user.id } });
      if (res.data.course.length > 0) {
        setData({ course: res.data.course[0], modules: res.data.modules, topics: res.data.topics, tests: res.data.tests });
      }
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <div className="p-2">
      <div className="grid grid-cols-2 gap-4">
        <p>{data?.course.name}</p>
        <Button onClick={() => navigate(`/course/${slug}/learning`)}>Enter</Button>
      </div>
    </div>
  );
}
