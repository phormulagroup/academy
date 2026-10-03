import { Tag } from "antd";
import { LuBell, LuClock, LuFilePen } from "react-icons/lu";

const TONES = {
  draft: { color: "default", icon: <LuFilePen />, label: "Draft" },
  scheduled: { color: "blue", icon: <LuClock />, label: "Scheduled" },
  sent: { color: "green", icon: <LuBell />, label: "Sent" },
};

export function NotificationStatus({ status, t }) {
  const tone = TONES[status] ?? TONES.draft;
  return (
    <Tag color={tone.color} variant="outlined" className="m-0!">
      <span className="inline-flex items-center gap-1">
        {tone.icon}
        {t(tone.label)}
      </span>
    </Tag>
  );
}
