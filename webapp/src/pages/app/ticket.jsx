import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { Badge, Button, Drawer, Empty, Pagination, Tag } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import CreateTicket from "../../components/app/ticket/create";
import TicketConversation from "../../components/app/ticket/conversation";

import { Context } from "../../utils/context";
import endpoints from "../../utils/endpoints";
import { STATUS_COLORS, STATUS_LABELS } from "../../utils/ticket";

const PAGE_SIZE = 5;

// Tickets do próprio utilizador (substituiu a caixa de entrada): abrir um novo e acompanhar as respostas da equipa
export default function Ticket() {
  const { user, unreadTicketsCount, setUnreadTicketsCount, toastApi } = useContext(Context);
  const { t } = useTranslation();

  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.ticket.readByUserId, { params: { id_user: user.id } })
      .then((res) => {
        setTickets(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
        toastApi.error(t("Failed to load your tickets"));
      });
  }

  function openTicket(ticket) {
    setSelectedId(ticket.id);
    if (ticket.unread && unreadTicketsCount > 0) setUnreadTicketsCount((prev) => Math.max(0, prev - 1));
  }

  function closeAction(c) {
    if (c) getData();
    setSelectedId(null);
    setIsOpenCreate(false);
  }

  return (
    <div className="p-10 bg-[#EAEAEA] min-h-full">
      <Drawer size={700} open={!!selectedId} onClose={() => closeAction(true)} mask={{ closable: false }} footer={null} title={t("Ticket")} destroyOnHidden>
        {selectedId && <TicketConversation ticketId={selectedId} />}
      </Drawer>
      <CreateTicket open={isOpenCreate} close={closeAction} />

      <div className="page-frame">
        <div className="bg-[#F7F7F7] flex flex-col justify-center items-center p-10 shadow-lg rounded-[5px]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-4 items-center">
            <div className="hidden sm:block"></div>
            <p className="text-center font-bold text-2xl mb-0!">{t("Tickets")}</p>
            <div className="flex justify-center sm:justify-end items-center w-full">
              <Button size="large" onClick={() => setIsOpenCreate(true)}>
                {t("New ticket")}
              </Button>
            </div>
          </div>
          {tickets.length > 0 ? (
            <div className="w-full flex flex-col gap-4 items-center">
              {tickets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((ticket) => (
                <div
                  key={ticket.id}
                  className={`p-4 rounded-[5px] flex flex-col w-full cursor-pointer transition-colors shadow-[0px_3px_6px_#00000029] ${ticket.unread ? "bg-[#E6F9FC]" : "bg-white"}`}
                  onClick={() => openTicket(ticket)}>
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                      {!!ticket.unread && <Badge status="processing" />}
                      <p className={`text-[16px] mb-0! ${ticket.unread ? "font-bold" : ""}`}>{ticket.subject}</p>
                    </div>
                    <Tag color={STATUS_COLORS[ticket.status]} variant="outlined">
                      {t(STATUS_LABELS[ticket.status])}
                    </Tag>
                  </div>
                  <p className="text-[12px] text-[#8A8D98] mb-0! mt-2!">
                    {t("Last message")}: {dayjs(ticket.last_message_at).format("DD/MM/YYYY HH:mm")}
                  </p>
                </div>
              ))}
              {tickets.length > PAGE_SIZE && <Pagination className="mt-4!" total={tickets.length} current={currentPage} onChange={setCurrentPage} pageSize={PAGE_SIZE} showSizeChanger={false} />}
            </div>
          ) : (
            !isLoading && <Empty description={t("You don't have any tickets yet")} />
          )}
        </div>
      </div>
    </div>
  );
}
