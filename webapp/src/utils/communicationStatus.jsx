import { Tag } from "antd";

// Estado de uma comunicação (cor + texto traduzido)
const STATUS = {
  draft: { color: "default", label: "Draft" },
  scheduled: { color: "blue", label: "Scheduled" },
  sending: { color: "gold", label: "Sending" },
  sent: { color: "green", label: "Sent" },
  failed: { color: "red", label: "Failed" },
  cancelled: { color: "default", label: "Cancelled" },
};

export default function CommunicationStatus({ status, t }) {
  const item = STATUS[status] || STATUS.draft;
  return (
    <Tag variant="outlined" color={item.color} className="m-0!">
      {t(item.label)}
    </Tag>
  );
}
