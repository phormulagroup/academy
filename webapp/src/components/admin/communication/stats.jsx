import { Progress, Table, Tooltip } from "antd";
import { LuCircleAlert, LuMailCheck, LuMousePointerClick, LuUsers } from "react-icons/lu";
import { useTranslation } from "react-i18next";

const pct = (value, total) => (total > 0 ? Math.round((value / total) * 100) : 0);

function Card({ icon, color, label, value, percent, hint, extra }) {
  return (
    <div className="rounded-[15px] border border-solid border-[#E5E7EB] bg-white p-4 flex flex-col gap-1 min-w-0">
      <div className="flex items-center gap-2 text-[13px] text-[#8A8D98]">
        <span className="grid h-7 w-7 place-items-center rounded-lg text-[16px]" style={{ background: `${color}1A`, color }}>
          {icon}
        </span>
        <Tooltip title={hint}>
          <span className="truncate">{label}</span>
        </Tooltip>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[26px] font-bold leading-none" style={{ color }}>
          {value}
        </span>
        {percent !== undefined && <span className="text-[13px] text-[#8A8D98]">{percent}%</span>}
      </div>
      {percent !== undefined && <Progress percent={percent} showInfo={false} size="small" strokeColor={color} className="mb-0!" />}
      {extra}
    </div>
  );
}

// Números de uma comunicação já enviada. "Enviados" = aceites pelo servidor de e-mail (não garante que chegaram à caixa de
// entrada). Os cliques vêm do rastreio dos links (as aberturas não se medem: não são um valor fiável).
export default function CommunicationStats({ stats, tracked }) {
  const { t } = useTranslation();
  if (!stats) return null;
  const { total, sent, errors, pending, clicked = 0, topLinks = [] } = stats;
  const hasTracking = tracked && stats.tracking;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card icon={<LuUsers />} color="#163986" label={t("Recipients")} value={total} />
        <Card icon={<LuMailCheck />} color="#06D186" label={t("Sent")} value={sent} percent={pct(sent, total)} hint={t("Accepted by the mail server. It does not guarantee it reached the inbox")} />
        <Card icon={<LuCircleAlert />} color={errors > 0 ? "#F04C4B" : "#8A8D98"} label={t("Failed")} value={errors} percent={pct(errors, total)} extra={pending > 0 ? <span className="text-[12px] text-[#8A8D98]">{t("{{count}} pending", { count: pending })}</span> : null} />
        {hasTracking ? (
          <Card icon={<LuMousePointerClick />} color="#F76B15" label={t("Clicked")} value={clicked} percent={pct(clicked, sent)} hint={t("People who clicked at least one link, out of the e-mails sent")} />
        ) : (
          <div className="rounded-[15px] border border-dashed border-[#D9DCE3] p-4 text-[13px] text-[#8A8D98] flex items-center">{t("Clicks are not tracked for this communication")}</div>
        )}
      </div>

      {hasTracking && topLinks.length > 0 && (
        <div className="rounded-[15px] border border-solid border-[#E5E7EB] bg-white p-4">
          <p className="font-semibold mb-2!">{t("Most clicked links")}</p>
          <Table
            size="small"
            rowKey="url"
            pagination={false}
            dataSource={topLinks}
            columns={[
              { title: t("Link"), dataIndex: "url", key: "url", ellipsis: true, render: (url) => <a href={url} target="_blank" rel="noreferrer">{url}</a> },
              { title: t("People"), dataIndex: "people", key: "people", width: 90 },
              { title: t("Clicks"), dataIndex: "clicks", key: "clicks", width: 90 },
            ]}
          />
        </div>
      )}
    </div>
  );
}
