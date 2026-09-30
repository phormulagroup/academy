import { Button } from "antd";
import { useTranslation } from "react-i18next";
import { AiOutlineCheck } from "react-icons/ai";
import { RxChevronLeft } from "react-icons/rx";
import { Helmet } from "react-helmet";

// Ecrã de feedback mostrado quando o utilizador conclui o último item do curso
const CourseCompleted = ({ course, modules, itemsCount, onBack, onReview }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-10 min-h-full">
      <Helmet>
        <title>{course?.name}</title>
      </Helmet>
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#2F8351]/15 flex items-center justify-center completed-pop">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#2F8351] flex items-center justify-center shadow-lg">
          <AiOutlineCheck className="text-white w-10 h-10 sm:w-12 sm:h-12" />
        </div>
      </div>
      <p className="mt-8 text-[#00B9D6] font-semibold uppercase tracking-wider text-[12px] sm:text-[13px]">
        {t("Course completed")}
      </p>
      <h1 className="mt-2 text-[#163986] font-bold text-[22px] sm:text-[28px] lg:text-[32px] leading-tight">
        {t("Congratulations!")}
      </h1>
      <p className="mt-3 text-[#163986] text-[15px] sm:text-[17px] max-w-xl">
        {t("You have successfully completed")}{" "}
        <span className="font-bold">{course?.name}</span>.
      </p>
      <div className="mt-8 flex gap-4">
        <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-[#dbe3f0]">
          <p className="text-[#163986] font-bold text-[24px]">{modules?.length || 0}</p>
          <p className="text-[#506BA4] text-[13px]">{t("Modules")}</p>
        </div>
        <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-[#dbe3f0]">
          <p className="text-[#163986] font-bold text-[24px]">{itemsCount}</p>
          <p className="text-[#506BA4] text-[13px]">{t("Topics and tests")}</p>
        </div>
      </div>
      <div className="mt-10 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <Button
          size="large"
          className="main-cta-button"
          icon={<RxChevronLeft />}
          onClick={onBack}>
          {t("Back to course")}
        </Button>
        <Button size="large" className="main-secondary-cta-button" onClick={onReview}>
          {t("Review course")}
        </Button>
      </div>
    </div>
  );
};

export default CourseCompleted;
