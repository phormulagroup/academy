import { useTranslation } from "react-i18next";
import { AiFillCheckCircle, AiFillCloseCircle } from "react-icons/ai";

/**
 * @component CourseStatusBanner
 * @description Estado permanente do curso no eLearning: "Aprovado" quando o curso está concluído,
 * "Reprovado" quando o utilizador esgotou as tentativas de um teste sem aprovar.
 * @param {"approved"|"failed"} status
 */
function CourseStatusBanner({ status }) {
  const { t } = useTranslation();
  if (status !== "approved" && status !== "failed") return null;
  const approved = status === "approved";
  const Icon = approved ? AiFillCheckCircle : AiFillCloseCircle;
  return (
    <div
      role="status"
      className={`course-status-banner ${approved ? "approved" : "failed"} flex items-center gap-2.5 sm:gap-3 rounded-[5px] bg-white mb-3 sm:mb-4 px-3 py-2 sm:px-4 sm:py-3`}>
      <Icon
        className={`shrink-0 w-6 h-6 sm:w-7 sm:h-7 ${approved ? "text-[#2F8351]" : "text-[#DB0709]"}`}
      />
      <div className="min-w-0">
        <p
          className={`font-ryker font-bold leading-tight text-[14px] sm:text-[16px] lg:text-[17px] ${approved ? "text-[#2F8351]" : "text-[#DB0709]"}`}>
          {approved ? t("Approved") : t("Failed")}
        </p>
        <p className="text-[#163986] text-[11px] sm:text-[13px] lg:text-[14px]">
          {approved
            ? t("You have successfully completed the course")
            : t("You can only review the steps you have already done in this course")}
        </p>
      </div>
    </div>
  );
}

export default CourseStatusBanner;
