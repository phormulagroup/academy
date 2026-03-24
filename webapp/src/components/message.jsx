import { useContext, useEffect, useRef, useState } from "react";
import { Button, Col, Row, Modal, Form, Avatar, message } from "antd";
import { useTranslation } from "react-i18next";
import axios from "axios";
import endpoints from "../utils/endpoints";
import { Context } from "../utils/context";
import TipTapFormField from "./admin/tipTap/tipTapFormField";
import avatarImg from "../assets/Female.svg";
import CalendarIcon from "../assets/Backoffice/calendar.svg?react";
import dayjs from "dayjs";

export default function Message({ open, close }) {
  const { user, update, setInbox, selectedInbox } = useContext(Context);
  const { t } = useTranslation();

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState(false);

  const [form] = Form.useForm();

  const messagesEndRef = useRef();

  useEffect(() => {
    if (open && Object.keys(selectedInbox).length > 0) getData();
  }, [open, selectedInbox]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function getData() {
    setIsLoading(true);
    try {
      const res = await axios.get(endpoints.inbox.readByThread, { params: { id_thread: selectedInbox.id } });
      markAsRead();
      setMessages(res.data);
      setIsLoading(false);
      setNewMessage(false);
      scrollToBottom();
    } catch (err) {
      console.log(err);
    }
  }

  async function takeThread() {
    try {
      setIsLoading(true);
      await axios.post(endpoints.inbox.responsible, { data: { id_user_responsible: user.id, id_thread: selectedInbox.id } });
      setInbox((prev) => prev.map((m) => (m.id === selectedInbox.id ? { ...data, id_user_responsible: user.id } : data)));
      selectedInbox.id_user_responsible = user.id;
    } catch (err) {
      console.log(err);
    }
  }

  function sendMessage(values) {
    axios
      .post(endpoints.inbox.create, {
        data: {
          ...values,
          id_thread: selectedInbox.id,
          to_id_user: user.id === selectedInbox.id_user_responsible ? selectedInbox.id_user : selectedInbox.id_user_responsible,
          from_id_user: user.id,
        },
      })
      .then((res) => {
        console.log(res);
        setMessages((prev) => [
          ...prev,
          {
            ...selectedInbox,
            text: values.text,
            from_id_user: user.id,
            to_id_user: user.id === selectedInbox.id_user_responsible ? selectedInbox.id_user : selectedInbox.id_user_responsible,
            created_at: dayjs().format("YYYY-MM-DD HH:mm"),
          },
        ]);

        setInbox((prev) =>
          prev.map((m) =>
            m.id === selectedInbox.id
              ? {
                  ...m,
                  text: values.text,
                  from_id_user: user.id,
                  to_id_user: user.id === selectedInbox.id_user_responsible ? selectedInbox.id_user : selectedInbox.id_user_responsible,
                  created_at: dayjs().format("YYYY-MM-DD HH:mm"),
                  unread_messages: m.unread_messages + 1,
                }
              : m,
          ),
        );

        setNewMessage(true);
        scrollToBottom();
        form.resetFields();
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function markAsRead() {
    axios
      .post(endpoints.inbox.update, {
        data: { id_thread: selectedInbox.id, to_id_user: user.id },
      })
      .then((res) => {
        console.log(res);
        setInbox((prev) => prev.map((m) => (m.id === selectedInbox.id ? { ...m, unread_messages: 0 } : m)));
        form.resetFields();
      })
      .catch((err) => {
        console.log(err);
      });
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Modal
      key="modal-message"
      className="modal-message"
      width={600}
      style={{ minHeight: "calc(100vh - 40px)", top: 20, marginRight: 20 }}
      onCancel={() => close(newMessage)}
      open={open}
      maskClosable={false}
      footer={[]}
      title={selectedInbox.title}
    >
      <div className="flex flex-col w-full h-[calc(100%-40px)]">
        <div id="message-container" className="flex flex-col h-full p-4 overflow-auto">
          {messages.map((m) => (
            <div className={`${m.from_id_user === user.id ? "justify-start items-start" : ""} mb-4`}>
              <div className={`${m.from_id_user === user.id ? "flex flex-row-reverse" : "flex"}`}>
                <Avatar src={avatarImg} className="w-12.5! h-12.5! min-w-12.5! min-h-12.5!" />
                <div className={`${m.from_id_user === user.id ? "bg-[#C5CEE1] mr-2 text-[#163986]" : "bg-[#163986] ml-2 text-white"} flex flex-col w-full p-4 rounded-[5px]`}>
                  <div dangerouslySetInnerHTML={{ __html: m.text }} />
                  <div className="flex justify-start items-center mt-4">
                    <div className="flex justify-start items-center">
                      <CalendarIcon
                        className="max-w-3.75"
                        style={{
                          filter:
                            m.from_id_user === user.id
                              ? "brightness(0) saturate(100%) invert(12%) sepia(71%) saturate(4132%) hue-rotate(221deg) brightness(84%) contrast(85%)"
                              : "brightness(0) saturate(100%) invert(100%) sepia(10%) saturate(0%) hue-rotate(229deg) brightness(112%) contrast(101%)",
                        }}
                      />
                      <p className="ml-2 text-[12px]">{dayjs(m.created_at).format("DD/MM/YYYY")}</p>
                    </div>
                    <div className="ml-4">
                      <div className="flex justify-start items-center">
                        <CalendarIcon
                          className="max-w-3.75 "
                          style={{
                            filter:
                              m.from_id_user === user.id
                                ? "brightness(0) saturate(100%) invert(12%) sepia(71%) saturate(4132%) hue-rotate(221deg) brightness(84%) contrast(85%)"
                                : "brightness(0) saturate(100%) invert(100%) sepia(10%) saturate(0%) hue-rotate(229deg) brightness(112%) contrast(101%)",
                          }}
                        />
                        <p className="ml-2 text-[12px]">{dayjs(m.created_at).format("HH:mm")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4">
          {user.id_role === 1 ? (
            !selectedInbox.id_user_responsible ? (
              <Button onClick={takeThread}>{t("Take thread")}</Button>
            ) : (
              <div>
                <Form form={form} onFinish={sendMessage}>
                  <Form.Item name="text">
                    <TipTapFormField />
                  </Form.Item>
                </Form>
                <div className="flex justify-end items-center">
                  <Button className="mr-2">Cancel</Button>
                  <Button onClick={form.submit}>Send</Button>
                </div>
              </div>
            )
          ) : (
            <div>
              <Form form={form} onFinish={sendMessage}>
                <Form.Item name="text">
                  <TipTapFormField />
                </Form.Item>
              </Form>
              <div className="flex justify-end items-center">
                <Button className="mr-2">Cancel</Button>
                <Button onClick={form.submit}>Send</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
