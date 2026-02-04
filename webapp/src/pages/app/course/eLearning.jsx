import React, { useContext, useEffect, useState } from "react";
import { CloseOutlined, DownOutlined, LoginOutlined, MenuOutlined, ProfileOutlined } from "@ant-design/icons";
import { Avatar, Button, Collapse, Divider, Drawer, Dropdown, Layout, Menu, Progress } from "antd";
import { Link, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import endpoints from "../../../utils/endpoints";
import config from "../../../utils/config";

import { Context } from "../../../utils/context";

import Logout from "../../../components/logout";
import { FaRegUser } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { TbWorld } from "react-icons/tb";
import { AiOutlineArrowDown, AiOutlineArrowUp, AiOutlineCheck } from "react-icons/ai";
import { Render } from "@puckeditor/core";
import { configRender } from "../../../components/editor";
import dayjs from "dayjs";

const { Header, Content, Sider } = Layout;

const Learning = () => {
  const { user, logout, languages } = useContext(Context);
  const [isOpenDrawerMenu, setIsOpenDrawerMenu] = useState(false);
  const [isOpenLogout, setIsOpenLogout] = useState(false);
  const [selectedCourseItem, setSelectedCourseItem] = useState(null);
  const [data, setData] = useState(null);
  const [modules, setModules] = useState(null);
  const [progress, setProgress] = useState(null);
  const [progressPercentage, setProgressPercentage] = useState(0);

  const { t, i18n } = useTranslation();

  const [windowDimension, setWindowDimension] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const navigate = useNavigate();

  const { slug } = useParams();

  useEffect(() => {
    getData();
  }, [slug]);

  useEffect(() => {
    calcProgress();
  }, [progress]);

  async function getData() {
    try {
      const res = await axios.get(endpoints.course.readBySlug, { params: { slug, id_user: user.id } });
      console.log(res);
      if (res.data.course.length > 0) {
        setData({ course: res.data.course[0], modules: res.data.modules, topics: res.data.topics, tests: res.data.tests });

        if (res.data.modules.length > 0) {
          let auxModules = res.data.modules;
          let newModules = [];
          for (let i = 0; i < auxModules.length; i++) {
            auxModules[i].items = auxModules[i].items ? JSON.parse(auxModules[i].items) : null;
            if (auxModules[i].items) {
              for (let y = 0; y < auxModules[i].items.length; y++) {
                auxModules[i].items[y] = { type: auxModules[i].items[y].type, ...res.data.topics.filter((t) => t.id === auxModules[i].items[y].id)[0] };
              }
              newModules.push(auxModules[i]);
            }
          }

          setModules(newModules);
          setProgress(res.data.progress);
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  function selectCourseItem(item) {
    setSelectedCourseItem(item);
  }

  function next() {
    const auxData = {
      id_course: data.course.id,
      id_user: user.id,
      activity_type: selectedCourseItem.type === "topic" ? "topic" : "test",
      id_course_topic: selectedCourseItem.type === "topic" ? selectedCourseItem.id : null,
      id_course_test: selectedCourseItem.type === "test" ? selectedCourseItem.id : null,
      is_completed: 1,
      created_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      modified_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    };

    axios
      .post(endpoints.course.updateProgress, {
        data: auxData,
      })
      .then((res) => {
        console.log(res);
        const newProgress = Object.assign([], progress);
        newProgress.push(auxData);
        setProgress(newProgress);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function calcProgress() {
    const completed = progress?.filter((p) => (p.activity_type === "topic" || p.activity_type === "test") && p.is_completed === 1).length;
    const total = data?.topics.length + data?.tests.length;
    setProgressPercentage((100 * completed) / total);
  }

  return (
    <Layout>
      <Logout open={isOpenLogout} close={() => setIsOpenLogout(false)} submit={logout} />
      <Layout>
        <Header className="bg-white! shadow-[0px_4px_16px_#A7AFB754] flex justify-end items-center">
          <div className="flex justify-end items-center">
            {windowDimension.width > 1080 ? (
              <div className="flex justify-center items-center">
                <div>{progressPercentage}% COMPLETO</div>
                <div>
                  {progress?.filter((p) => (p.activity_type === "topic" || p.activity_type === "test") && p.is_completed === 1).length} / {data?.topics.length + data?.tests.length}
                </div>
              </div>
            ) : (
              <MenuOutlined onClick={() => setIsOpenDrawerMenu(true)} />
            )}
          </div>
        </Header>

        <Layout>
          <Sider width={400} className="bg-[#fff]! overflow-auto">
            <div className="flex flex-col h-full">
              <div className="flex flex-col w-full p-6 bg-[#010202]">
                <p className="text-white">{t("Course")}</p>
                <p className="text-[20px] font-bold text-white">{data?.course?.name}</p>
              </div>
              <div className="w-full">
                {modules?.length > 0 && (
                  <Collapse
                    className="collapse-learning"
                    size="large"
                    bordered={false}
                    items={modules.map((item) => ({
                      key: item.id,
                      label: (
                        <div className="flex flex-col">
                          <div onClick={() => selectCourseItem(t)} className="p-2 cursor-pointer flex items-center">
                            {progress.length > 0 && progress.filter((p) => t.type === "module" && p.id_module === t.id_course_module).length > 0 ? (
                              <div className={`w-[25px] h-[25px] rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center`}>
                                <AiOutlineCheck className="text-white" />
                              </div>
                            ) : (
                              <div className={`w-[25px] h-[25px] rounded-full bg-white border border-[#2F8351]`}></div>
                            )}
                            <p className={`text-[14px] ml-2`}>{item.title}</p>
                          </div>
                        </div>
                      ),
                      children: (
                        <div className="flex flex-col">
                          {item.items.map((t) => (
                            <div onClick={() => selectCourseItem(t)} className="p-2 pl-6 cursor-pointer flex items-center">
                              {progress.length > 0 && progress.filter((p) => (t.type === "topic" ? p.id_course_topic === t.id : p.id_course_test === t.id)).length > 0 ? (
                                <div className={`w-[25px] h-[25px] rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center`}>
                                  <AiOutlineCheck className="text-white" />
                                </div>
                              ) : (
                                <div className={`w-[25px] h-[25px] rounded-full bg-white border border-[#2F8351]`}></div>
                              )}
                              <p className={`text-[14px] ml-2 ${selectedCourseItem?.id === t.id ? "font-bold" : ""}`}>{t.title}</p>
                            </div>
                          ))}
                        </div>
                      ),
                    }))}
                    expandIconPlacement="end"
                    expandIcon={(panelProps) => {
                      let content = modules.filter((item) => item.id === parseInt(panelProps.panelKey))[0];
                      let topics = content.items?.filter((t) => t.type === "topic");
                      let tests = content.items?.filter((t) => t.type === "test");
                      console.log(panelProps);
                      return (
                        <div className="flex justify-center items-center">
                          <div className="w-[20px] h-[20px] rounded-full bg-[#FFC600] flex justify-center items-center mr-2">
                            {panelProps.isActive ? <AiOutlineArrowUp className="w-[15px] h-[15px] text-white" /> : <AiOutlineArrowDown className="w-[15px] h-[15px] text-white" />}
                          </div>
                          <p>
                            {topics ? `${topics.length} ${t("topic")} ${tests.length > 0 ? " | " : ""}` : ""} {` ${tests.length > 0 ? `${tests.length} ${t("test")}` : ""}`}
                          </p>
                        </div>
                      );
                    }}
                  />
                )}
              </div>
            </div>
          </Sider>
          <div className="h-[calc(100vh-64px)] overflow-auto w-full">
            {selectedCourseItem && Object.keys(selectedCourseItem).length > 0 && selectedCourseItem.content && Object.keys(selectedCourseItem.content).length > 0 && (
              <div className="flex justify-between flex-col h-full">
                <div className="p-8 overflow-y-auto">
                  <Render config={configRender} data={selectedCourseItem.content ? JSON.parse(selectedCourseItem.content) : {}} />
                </div>
                <div className="p-8 flex justify-between items-center bg-[#707070]">
                  <Button>{t("Previous")}</Button>
                  <Button onClick={() => next()}>{t("Next")}</Button>
                </div>
              </div>
            )}
          </div>
        </Layout>
      </Layout>
    </Layout>
  );
};
export default Learning;
