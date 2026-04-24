import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Checkbox, Collapse, Dropdown, Empty, Form, Image, Input, Pagination, Select, Tag } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaArrowAltCircleRight, FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/admin/table";
import Create from "../../components/admin/notification/create";
import Update from "../../components/admin/notification/update";
import Delete from "../../components/admin/delete";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { AiOutlinePlus } from "react-icons/ai";
import { useTranslation } from "react-i18next";
import { RxReload } from "react-icons/rx";
import dayjs from "dayjs";
import NotificationIcon from "../../assets/Notifications-off.svg?react";
import { RiCloseCircleLine } from "react-icons/ri";
import i18n from "../../utils/i18n";
import config from "../../utils/config";

import trailLoadingAnimation from "../../assets/Trail-loading.json";
import Lottie from "lottie-react";
import { Helmet } from "react-helmet";

export default function Contact() {
  const { languages, user } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState(null);
  const [pageSize] = useState(5);

  const { t } = useTranslation();

  function submit() {
    setIsButtonLoading(true);
    axios
      .get(endpoints.form.create, { params: { id_lang: languages.filter((_l) => _l.code === i18n.language)[0].id } })
      .then((res) => {
        console.log(res);
        setIsButtonLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsButtonLoading(false);
      });
  }

  return (
    <div className="container mx-auto p-6 flex flex-col justify-start items-center mt-10">
      <Helmet>
        <meta charSet="utf-8" />
        <title>{t("Contact")} - Bial Regional Academy</title>
        <meta name="description" content={`${t("Contact")} - Bial Regional Academy`} />
        <meta property="og:title" content={`${t("Contact")} - Bial Regional Academy`} />
        <meta property="og:description" content={`${t("Contact")} - Bial Regional Academy`} />
      </Helmet>
      <div className="flex flex-col mb-10">
        <p className="text-[30px] font-bold text-center">{t("Contact form")}</p>
        <p className="text-center">{t("Talk with us")}</p>
        <p className="mt-6 text-[16px]">{t("For any questions or clarifications, please send us a message through this Contact Form.")}</p>
      </div>
      <div className="w-full flex flex-col justify-center items-center">
        <Form onFinish={submit} className="w-full grid grid-cols-1 md:grid-cols-3 gap-x-6 max-w-[1200px]" layout="vertical">
          <Form.Item name="subject" label={t("Subject")} className="col-span-3 md:col-span-1">
            <Select
              size="large"
              className="w-full"
              placeholder={t("Your subject")}
              showSearch={{
                optionFilterProp: ["label"],
              }}
              options={[
                {
                  label: t("Medical and scientific information"),
                  value: t("Medical and scientific information"),
                },
                {
                  label: t("Courses"),
                  value: t("Courses"),
                },
                {
                  label: t("Technical support"),
                  value: t("Technical support"),
                },
                {
                  label: t("Other subjects"),
                  value: t("Other subjects"),
                },
              ]}
            />
          </Form.Item>
          <Form.Item name="name" label={t("Name")} className="col-span-3 md:col-span-1">
            <Input size="large" placeholder={t("Your name")} />
          </Form.Item>
          <Form.Item name="email" label={t("Email")} className="col-span-3 md:col-span-1">
            <Input size="large" placeholder={t("Your email")} />
          </Form.Item>
          <Form.Item name="message" label={t("Message")} className="col-span-1 md:col-span-3">
            <Input.TextArea maxLength={200} showCount size="large" placeholder={t("Your message")} rows={6} />
          </Form.Item>
          <div className="flex col-span-1 md:col-span-3">
            <p className="text-[12px] text-[#707070]">{t("Fields marked with * are required.")}</p>
          </div>
          <div className="flex col-span-1 md:col-span-3">
            <Form.Item name="remember" valuePropName="checked" className="mb-0!">
              <Checkbox size="large">
                <p className="text-[#707070] text-[12px]">
                  {t("By submitting this Contact Form, I declare that I am familiar with this website's Privacy Policy, as well as the Terms and Conditions, available below.")}
                </p>
              </Checkbox>
            </Form.Item>
          </div>
          <div className="flex justify-center items-center col-span-1 md:col-span-3 mt-4 mb-6">
            <Button size="large" type="primary" htmlType="submit" className="min-w-[120px]" loading={isButtonLoading}>
              {t("Send")}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
