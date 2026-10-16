import { useState } from "react";
import { Badge, Button, Progress, Tabs, Tag } from "antd";
import dayjs from "dayjs";
import { LuAward, LuCalendar, LuChevronDown, LuClipboardList, LuCloudDownload, LuLayers, LuListChecks } from "react-icons/lu";
import { PiCalendarBlank, PiHourglassMedium } from "react-icons/pi";
import { useTranslation } from "react-i18next";

import config from "../../../utils/config";
import { courseStats } from "../../../utils/userResults";
import { timeUntil } from "../../../utils/courseStatus";
import ModuleProgress from "./moduleProgress";
import TestResult from "./testResult";
import { progressPercent } from "../../../utils/percent";

// Estado do aluno no curso: aprovado (100%), reprovado (esgotou as tentativas de um teste), em curso ou por iniciar
const STATUS = {
  completed: { label: "Approved", color: "green" },
  failed: { label: "Failed", color: "red" },
  in_progress: { label: "In progress", color: "blue" },
  not_started: { label: "Not started", color: "default" },
};

// Borda como no catálogo: aprovado verde, reprovado vermelho, expirado azul do CTA, por abrir laranja Bial
const BORDER = {
  completed: "border-[#2F8351] bg-[#2F8351]/5",
  failed: "border-[#DB0709] bg-[#DB0709]/5",
  expired: "border-[#00B9D6] bg-[#00B9D6]/5",
  upcoming: "border-[#FF7D5A] bg-[#FF7D5A]/5",
};

const Tile = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-[12px] border border-solid border-[#E5E7EB] bg-white p-3">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#E6F9FC] text-[18px] text-[#163986]">{icon}</span>
    <div className="min-w-0">
      <p className="mb-0! text-[11px] text-[#8A8D98]">{label}</p>
      <p className="mb-0! truncate text-[15px] font-bold">{value}</p>
    </div>
  </div>
);

// Resultado de um aluno num curso: cabeçalho com estado e progresso e, ao abrir, resumo, progresso por módulo e testes
export default function CourseResult({ course, student, onChange, onDownloadCertificate, open: openProp, onToggle }) {
  const { t } = useTranslation();
  // Controlado pela lista (acordeão: abrir um resultado fecha os outros); sem props, estado próprio
  const [openLocal, setOpenLocal] = useState(false);
  const open = openProp ?? openLocal;
  const toggle = () => (onToggle ? onToggle(!open) : setOpenLocal((v) => !v));
  const stats = courseStats(course);
  const statusKey = stats.status !== "completed" && course.isFailed ? "failed" : stats.status;
  const status = STATUS[statusKey];
  const isCompleted = statusKey === "completed";
  const tests = course.allItems.filter((i) => i.type === "test");
  const date = (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "-");
  const dates = course.course.settings?.course_access_expiration_dates || {};
  const border = BORDER[course.dateState] || BORDER[statusKey] || "border-[#E5E7EB] bg-white";

  // Aviso ao Admin: o curso expirou ou ainda não abriu, por isso o aluno não o vê no catálogo (pode na mesma marcar como concluído)
  const dateNotice =
    course.dateState === "expired" ? (
      <span className="course-card-date-inline">
        <PiHourglassMedium className="shrink-0" />
        <span className="font-ryker font-bold uppercase">{t("Expired")}</span>
        {dates.end_date && <span>· {t("Ended on")} {date(dates.end_date)}</span>}
      </span>
    ) : course.dateState === "upcoming" ? (
      <span className="course-card-date-inline course-card-date-inline-upcoming">
        <PiCalendarBlank className="shrink-0" />
        <span className="font-ryker font-bold uppercase">{t("Coming soon")}</span>
        <span>
          · {t("Opens to students in {{time}}", { time: timeUntil(dates.start_date) })} · {date(dates.start_date)}
        </span>
      </span>
    ) : null;

  return (
    <div className={`overflow-hidden rounded-[16px] border border-solid ${border}`}>
      <div role="button" tabIndex={0} onClick={toggle} onKeyDown={(e) => e.key === "Enter" && toggle()} className="flex cursor-pointer flex-wrap items-center gap-4 p-4 hover:bg-black/[0.02]">
        {/* Miniaturas 800x600: caixa 4:3, a imagem não é cortada; expirado a cinzento como no catálogo */}
        <div className="aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-[10px] bg-[#E6F9FC]">
          {course.course.thumbnail && <img src={`${config.server_ip}/media/${course.course.thumbnail}`} alt="" className={`h-full w-full object-cover ${course.dateState === "expired" ? "grayscale" : ""}`} />}
        </div>
        <div className="min-w-[200px] flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="mb-0! text-[17px] font-bold">{course.course.name}</p>
            <Tag color={status.color} className="m-0!">
              {t(status.label)}
            </Tag>
            {dateNotice}
          </div>
          <p className="mb-2! text-[12px] text-[#8A8D98]">{stats.lastActivity && statusKey !== "not_started" ? `${t("Last activity at")} ${dayjs(stats.lastActivity).format("DD/MM/YYYY HH:mm")}` : t("Not started")}</p>
          <div className="flex items-center gap-3">
            <Progress percent={stats.percent} showInfo={false} strokeColor={statusKey === "failed" ? "#DB0709" : "#2F8351"} railColor="#EAEAEA" className="max-w-[320px]!" size="small" />
            <span className={`text-[12px] font-bold whitespace-nowrap ${stats.percent === 100 ? "text-[#2F8351]" : "text-[#5B5F6B]"}`}>{progressPercent(stats.percent)}%</span>
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
        <div className={`border-0 border-t border-solid ${isCompleted ? "border-[#2F8351]/30" : "border-[#EEF0F5]"} p-4 md:p-6`}>
          <Tabs
            items={[
              {
                key: "overview",
                label: t("Overview"),
                children: (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Tile icon={<LuLayers />} label={t("Modules")} value={`${stats.modulesDone}/${stats.modulesTotal}`} />
                    <Tile icon={<LuListChecks />} label={t("Topics")} value={`${stats.topicsDone}/${stats.topicsTotal}`} />
                    <Tile icon={<LuClipboardList />} label={t("Tests")} value={`${stats.testsDone}/${stats.testsTotal}`} />
                    <Tile icon={<LuCalendar />} label={t("Start Date")} value={stats.startedAt ? date(stats.startedAt) : t("Not started")} />
                    <Tile icon={<LuCalendar />} label={t("Completion date")} value={date(stats.completedAt)} />
                    <Tile icon={<LuAward />} label={t("Certificate")} value={stats.hasCertificate ? t("Available") : t("Not available")} />
                  </div>
                ),
              },
              {
                key: "progress",
                label: t("Progress"),
                children: (
                  <>
                    {dateNotice && <div className="mb-4">{dateNotice}</div>}
                    <ModuleProgress course={course} student={student} onChange={onChange} />
                  </>
                ),
              },
              {
                key: "tests",
                label: (
                  <span className="flex items-center gap-2">
                    {t("Tests")}
                    <Badge count={tests.length} showZero color="#163986" size="small" />
                  </span>
                ),
                children: (
                  <div className="flex flex-col gap-4">
                    {tests.length > 0 ? tests.map((test) => <TestResult key={test.id} course={course} test={test} onChange={onChange} />) : <p className="py-6 text-center text-[#8A8D98]">{t("This course has no tests")}</p>}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
