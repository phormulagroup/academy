import { Drawer } from "antd";
import { useTranslation } from "react-i18next";

import TicketConversation from "../../app/ticket/conversation";

// Gaveta à volta da conversa partilhada: os controlos da equipa já vêm incluídos, o próprio componente decide mostrá-los
export default function TicketDetails({ ticketId, open, close }) {
  const { t } = useTranslation();
  return (
    <Drawer title={t("Ticket")} size={640} open={open} onClose={() => close(true)} destroyOnHidden>
      {ticketId && <TicketConversation ticketId={ticketId} />}
    </Drawer>
  );
}
