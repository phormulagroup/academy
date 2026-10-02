import { useState } from "react";
import { Button, Progress, Tag } from "antd";
import dayjs from "dayjs";
import { LuAward, LuCalendar, LuChevronDown, LuClipboardList, LuCloudDownload, LuLayers, LuListChecks } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import config from "../../../utils/config";
import { courseStats } from "../../../utils/userResults";
import CourseContent from "../../../pages/app/course/content";

const STATUS = {
  completed: { label: "Completed", color: "green" },
  in_progress: { label: "In progress", color: "blue" },
  not_started: { label: "Not started", color: "default" },
};

const Tile = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-[12px] border border-solid border-[#E5E7EB] bg-white p-3">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#E6F9FC] text-[18px] text-[#163986]">{icon}</span>
    <div className="min-w-0">
      <p className="mb-0! text-[11px] text-[#8A8D98]">{label}</p>
      <p className="mb-0! truncate text-[14px] font-bold">{value}</p>
    </div>
  </div>
);

// Resultado do próprio utilizador num curso: estado e progresso no cabeçalho e, ao abrir, resumo e conteúdo (módulos e itens)
export default function CourseResult({ course, onDownloadCertificate }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const stats = courseStats(course);
  const status = STATUS[stats.status];
  const isCompleted = stats.status === "completed";
  const date = (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "-");

  return (
    <div className={`overflow-hidden rounded-[16px] border border-solid shadow-[0px_3px_6px_#00000014] ${isCompleted ? "border-[#2F8351] bg-[#2F8351]/5" : "border-[#E5E7EB] bg-white"}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((v) => !v)}
        className={`flex cursor-pointer flex-wrap items-center gap-3 p-3 sm:gap-4 sm:p-4 ${isCompleted ? "hover:bg-[#2F8351]/10" : "hover:bg-[#FAFBFD]"}`}>
        <div className="hidden h-16 w-24 shrink-0 overflow-hidden rounded-[10px] bg-[#E6F9FC] sm:block">
          {course.course.thumbnail && <img src={`${config.server_ip}/media/${course.course.thumbnail}`} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-[180px] flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="mb-0! font-ryker text-[16px] font-bold leading-tight sm:text-[18px]">{course.course.name}</p>
            <Tag color={status.color} className="m-0!">
              {t(status.label)}
            </Tag>
          </div>
          <p className="mb-2! text-[12px] text-[#707070]">{stats.lastActivity ? `${t("Last activity at")} ${dayjs(stats.lastActivity).format("DD/MM/YYYY HH:mm")}` : t("Not started")}</p>
          <div className="flex items-center gap-3">
            <Progress percent={stats.percent} showInfo={false} strokeColor="#2F8351" railColor="#EAEAEA" className="max-w-[320px]!" size="small" />
            <span className={`whitespace-nowrap text-[12px] font-bold ${stats.percent === 100 ? "text-[#2F8351]" : "text-[#5B5F6B]"}`}>{stats.percent}%</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {stats.hasCertificate && (
            <Button
              className="certificate-button"
              onClick={(e) => {
                e.stopPropagation();
                onDownloadCertificate(course.course, course.progress);
              }}>
              <span className="flex items-center gap-1">
                <LuCloudDownload />
                {t("Certificate")}
              </span>
            </Button>
          )}
          <LuChevronDown className={`text-[20px] text-[#163986] transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </div>

      {open && (
        <div className={`border-0 border-t border-solid p-3 sm:p-5 ${isCompleted ? "border-[#2F8351]/30" : "border-[#EEF0F5]"}`}>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Tile icon={<LuLayers />} label={t("Modules")} value={`${stats.modulesDone}/${stats.modulesTotal}`} />
            <Tile icon={<LuListChecks />} label={t("Topics")} value={`${stats.topicsDone}/${stats.topicsTotal}`} />
            <Tile icon={<LuClipboardList />} label={t("Tests")} value={`${stats.testsDone}/${stats.testsTotal}`} />
            <Tile icon={<LuCalendar />} label={t("Start Date")} value={stats.startedAt ? date(stats.startedAt) : t("Not started")} />
            <Tile icon={<LuCalendar />} label={t("Completion date")} value={date(stats.completedAt)} />
            <Tile icon={<LuAward />} label={t("Certificate")} value={stats.hasCertificate ? t("Available") : t("Not available")} />
          </div>
          <CourseContent
            modules={course.modules}
            progress={course.progress}
            data={{ topics: course.allItems.filter((i) => i.type === "topic"), tests: course.allItems.filter((i) => i.type === "test") }}
            courseSlug={course.course.slug}
            compact
          />
        </div>
      )}
    </div>
  );
}
