import axios from "axios";
import { useContext } from "react";
import { useState } from "react";
import { Button, Checkbox, Form, Input, Select } from "antd";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import i18n from "../../utils/i18n";

import { Helmet } from "react-helmet";

export default function Contact() {
  const { t, languages, messageApi } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [form] = Form.useForm();

  function submit(values) {
    setIsButtonLoading(true);
    axios
      .post(endpoints.form.create, {
        data: {
          ...values,
          id_lang: languages.filter((_l) => _l.code === i18n.language)[0].id,
        },
      })
      .then((res) => {
        console.log(res);
        setIsButtonLoading(false);
        messageApi.open({
          type: "success",
          content: t(
            "You message was sent successfully! We will reply as soon as possible.",
          ),
        });
        form.resetFields();
      })
      .catch((err) => {
        console.log(err);
        messageApi.open({
          type: "error",
          content: t(
            "An error occurred while sending your message, try again later.",
          ),
        });
        setIsButtonLoading(false);
      });
  }

  return (
    <div className="container mx-auto p-6 flex flex-col justify-start items-center mt-10">
      <Helmet>
        <meta charSet="utf-8" />
        <title>{t("Contact")} - Bial Regional Academy</title>
        <meta
          name="description"
          content={`${t("Contact")} - Bial Regional Academy`}
        />
        <meta
          property="og:title"
          content={`${t("Contact")} - Bial Regional Academy`}
        />
        <meta
          property="og:description"
          content={`${t("Contact")} - Bial Regional Academy`}
        />
      </Helmet>
      <div className="flex flex-col mb-10">
        <p className="text-[30px] font-bold text-center text-[#163986]">
          {t("Contact form")}
        </p>
        <p className="text-[20px] text-center italic text-[#163986]">
          {t("Talk with us")}
        </p>
        <p className="mt-6 text-[16px] text-[#163986]">
          {t(
            "For any questions or clarifications, please send us a message through this Contact Form.",
          )}
        </p>
      </div>
      <div className="w-full flex flex-col justify-center items-center">
        <Form
          form={form}
          onFinish={submit}
          className="w-full grid grid-cols-1 md:grid-cols-3 gap-x-6 max-w-300"
          layout="vertical"
          validateMessages={{
            required: t("This field is required."),
          }}>
          <Form.Item
            name="subject"
            label={t("Subject")}
            className="col-span-3 md:col-span-1"
            rules={[{ required: true }]}
            required>
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
                  value: "Medical and scientific information",
                },
                {
                  label: t("Courses"),
                  value: "Courses",
                },
                {
                  label: t("Technical support"),
                  value: "Technical support",
                },
                {
                  label: t("Other subjects"),
                  value: "Other subjects",
                },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="name"
            label={t("Name")}
            className="col-span-3 md:col-span-1"
            rules={[{ required: true }]}
            required>
            <Input size="large" placeholder={t("Your name")} />
          </Form.Item>
          <Form.Item
            name="email"
            label={t("Email")}
            className="col-span-3 md:col-span-1"
            rules={[
              { required: true },
              { type: "email", message: t("Please enter a valid email!") },
            ]}
            required>
            <Input size="large" placeholder={t("Your email")} />
          </Form.Item>
          <Form.Item
            name="message"
            label={t("Message")}
            className="col-span-1 md:col-span-3"
            rules={[{ required: true }]}
            required>
            <Input.TextArea
              maxLength={200}
              showCount
              size="large"
              placeholder={t("Your message")}
              rows={6}
            />
          </Form.Item>
          <div className="flex col-span-1 md:col-span-3">
            <p className="text-[12px] text-[#707070]">
              {t("Fields marked with * are required.")}
            </p>
          </div>
          <div className="flex col-span-1 md:col-span-3">
            <Form.Item
              name="acceptance"
              valuePropName="checked"
              className="mb-0!"
              rules={[
                {
                  validator: (_, value) => {
                    if (value === true) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error(
                        t("Please check this box if you want to proceed."),
                      ),
                    );
                  },
                },
              ]}>
              <Checkbox size="large">
                <p className="text-[#707070] text-[12px]">
                  {t(
                    "By submitting this Contact Form, I declare that I am familiar with this website's Privacy Policy, as well as the Terms and Conditions, available below.",
                  )}
                </p>
              </Checkbox>
            </Form.Item>
          </div>
          <div className="flex justify-center items-center col-span-1 md:col-span-3 mt-4 mb-6">
            <Button
              size="large"
              type="primary"
              htmlType="submit"
              className="min-w-30 main-cta-button"
              loading={isButtonLoading}>
              {t("Send")}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
