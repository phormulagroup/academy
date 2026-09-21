import { Collapse } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { RxChevronUp, RxChevronDown, RxCheck } from "react-icons/rx";
import { FaListCheck } from "react-icons/fa6";
import { PiFileTextLight } from "react-icons/pi";
import i18n from "../../../utils/i18n";
import { Context } from "../../../utils/context";

export default function CourseContent({ modules, progress, data }) {
  const { t } = useTranslation();
  const { windowDimension } = useContext(Context);

  const { slug } = useParams();

  const navigate = useNavigate();

  // Verifica se o utilizador está inscrito no curso ou já completou
  const isEnrolled =
    progress.filter((p) => p.activity_type === "enroll" && p.is_completed === 1)
      .length > 0;

  const isCourseCompleted =
    progress.filter((p) => p.activity_type === "course" && p.is_completed === 1)
      .length > 0;

  const canAccess = isEnrolled || isCourseCompleted;

  // Check if a module is truly completed based on its actual items
  function isModuleCompleted(module) {
    if (!module || !module.items || module.items.length === 0) {
      return false; // Module with no items is not completed
    }

    // All items in the module must be completed
    return module.items.every((item) => {
      const itemProgress = progress?.filter(
        (p) =>
          p.is_completed === 1 &&
          p.is_deleted !== 1 &&
          p.activity_type === item.type &&
          p[`id_course_${item.type}`] === item.id,
      );
      return itemProgress && itemProgress.length > 0;
    });
  }

  function handleNavigate(courseItemId, courseItemType) {
    if (!canAccess) {
      return; // Prevenir navegação se não estiver inscrito ou curso não completado
    }
    navigate(`/${i18n.language}/courses/${slug}/learning`, {
      state: {
        courseItemId,
        courseItemType,
      },
    });
  }

  function calcProgress(items) {
    if (items && items.length > 0) {
      let completed = items
        .map(
          (item) =>
            progress.filter(
              (p) =>
                p.is_completed === 1 &&
                p.is_deleted !== 1 &&
                p.id_course_module === item.id_course_module &&
                p.activity_type === item.type &&
                (item.id === p.id_course_topic || item.id === p.id_course_test),
            ).length,
        )
        .reduce((acc, v) => acc + v, 0);

      let progressPercentage = (100 * completed) / items.length;
      const isInteger = progressPercentage % 1 === 0;

      return (
        <p className="text-[#FFFFFF] text-[14px] sm:text-[16px] md:text-[16px] lg:text-[18px]">
          <span className="font-bold uppercase">
            {!isInteger
              ? (Math.round(progressPercentage * 100) / 100).toFixed(2)
              : progressPercentage}
            % {t("Completed")}
          </span>{" "}
          | {completed}/{items.length} {t("Steps")}
        </p>
      );
    }
    return <p></p>;
  }

  return (
    <div className="mb-10">
      {modules && modules.length > 0 ? (
        <Collapse
          className="collapse-course"
          size="large"
          bordered={false}
          items={modules
            ?.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((item) => ({
              key: item.id,
              label: (
                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 p-2 w-full min-w-0">
                  <div
                    className={`p-2 flex min-w-0 ${canAccess ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                    // onClick={() => handleNavigate(item.id, "module")}
                  >
                    {isModuleCompleted(item) ? (
                      <div
                        className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center`}>
                        <RxCheck className="text-white" />
                      </div>
                    ) : (
                      <div
                        className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-white border border-[#2F8351]`}></div>
                    )}
                    <div className="flex flex-col ml-4 max-w-full flex-1 min-w-0 overflow-hidden">
                      <p
                        className={`text-[#163986] font-bold text-[16px] sm:text-[16px] md:text-[18px] lg:text-[20px] line-clamp-2 w-full overflow-hidden`}>
                        {item.title}
                      </p>
                      <p className="mt-1 text-[#163986] text-[13px] lg:text-[14px] line-clamp-2">
                        {data?.topics &&
                        data.topics.filter(
                          (_t) => _t.id_course_module === item.id,
                        ).length > 0
                          ? `${data.topics.filter((_t) => _t.id_course_module === item.id).length} ${t("topic")} ${data?.tests.length > 0 && data.tests.filter((_t) => _t.id_course_module === item.id).length > 0 ? " | " : ""}`
                          : ""}{" "}
                        {` ${data?.tests.length > 0 && data.tests.filter((_t) => _t.id_course_module === item.id).length > 0 ? `${data.tests.filter((_t) => _t.id_course_module === item.id).length} ${t("test")}` : ""}`}
                      </p>
                    </div>
                  </div>
                </div>
              ),
              children: (
                <div className="flex flex-col">
                  {/* Mobile: 0-729px - Module Content with responsive icon and label - CENTERED */}
                  {windowDimension.width <= 767 && (
                    <div className="p-4 sm:p-6 bg-[#FF9E83] flex flex-col justify-center items-center">
                      <div className="flex items-center gap-3 justify-center">
                        {windowDimension.width >= 600 && (
                          <PiFileTextLight className="text-[#FFFFFF] w-5 h-5 sm:w-6 sm:h-6" />
                        )}
                        <p
                          className="text-[#FFFFFF] font-bold"
                          style={{
                            fontSize:
                              windowDimension.width >= 425 &&
                              windowDimension.width < 768
                                ? "16px"
                                : "14px",
                          }}>
                          {t("Module content")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Desktop: 768px+ - Icon + Label + Progress in flex row */}
                  {windowDimension.width >= 768 && (
                    <div className="hidden md:flex md:p-6 bg-[#FF9E83] justify-between items-center">
                      <div className="flex items-center gap-3">
                        <PiFileTextLight className="text-[#FFFFFF] w-6 h-6 lg:w-8 lg:h-8" />
                        <p className="text-[#FFFFFF] font-bold text-[16px] lg:text-[18px]">
                          {t("Module content")}
                        </p>
                      </div>
                      <div>{calcProgress(item.items)}</div>
                    </div>
                  )}

                  {/* Mobile progress bar */}
                  {windowDimension.width < 768 && (
                    <div className="p-4 sm:p-6 bg-[#FF9E83] flex justify-center items-center">
                      <div className="text-center text-white font-bold text-sm sm:text-base">
                        {calcProgress(item.items)}
                      </div>
                    </div>
                  )}
                  <div className="p-4">
                    {item.items && item.items.length > 0 ? (
                      item.items.map((_t, i) => (
                        <div
                          onClick={() => handleNavigate(_t.id, _t.type)}
                          className={`group p-4 pl-6 flex items-center gap-3 sm:gap-4 text-[14px] lg:text-[16px] ${canAccess ? "cursor-pointer hover:bg-[#FF9E83]" : "cursor-not-allowed opacity-50"} ${i < item.items.length - 1 ? "border-b border-[#969696]" : ""} transition-all`}>
                          {/* Circle check indicator */}
                          {progress.length > 0 &&
                          progress.filter(
                            (p) =>
                              p.is_completed === 1 &&
                              p.is_deleted !== 1 &&
                              p.activity_type === _t.type &&
                              p[`id_course_${_t.type}`] === _t.id,
                          ).length > 0 ? (
                            <div
                              className={`w-5 h-5 sm:w-6.25 sm:h-6.25 min-w-5 sm:min-w-6.25 min-h-5 sm:min-h-6.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center transition-all shrink-0 ${canAccess ? "group-hover:bg-[#FFFFFF] group-hover:border-[#FFFFFF]" : ""}`}>
                              <RxCheck
                                className={`text-white transition-colors w-3 h-3 sm:w-4 sm:h-4 ${canAccess ? "group-hover:text-[#163986]" : ""}`}
                              />
                            </div>
                          ) : (
                            <div
                              className={`w-5 h-5 sm:w-6.25 sm:h-6.25 min-w-5 sm:min-w-6.25 min-h-5 sm:min-h-6.25 rounded-full bg-white border border-[#2F8351] shrink-0`}></div>
                          )}
                          {/* Test icon - only for test type items */}
                          {_t.type === "test" && (
                            <FaListCheck className="text-[#163986] shrink-0 w-4 h-4 sm:w-5 sm:h-5 transition-colors group-hover:text-[#FFFFFF]" />
                          )}
                          {/* Item title */}
                          <p
                            className={`text-[#163986] font-medium transition-colors line-clamp-2 w-full ${canAccess ? "group-hover:text-[#FFFFFF] group-hover:font-bold" : ""}`}>
                            {_t.title}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 flex justify-center items-center">
                        <p className="text-[#163986]">{t("No items")}</p>
                      </div>
                    )}
                  </div>
                </div>
              ),
            }))}
          expandIconPlacement="end"
          expandIcon={(panelProps) => {
            return (
              <div className="flex justify-center items-center">
                {windowDimension.width >= 1024 && (
                  <div className="mr-2">
                    {panelProps.isActive ? (
                      <p className="font-bold text-[#163986] text-sm sm:text-sm md:text-base">
                        {t("Collapse")}
                      </p>
                    ) : (
                      <p className="font-bold text-[#163986] text-sm sm:text-sm md:text-base">
                        {t("Expand")}
                      </p>
                    )}
                  </div>
                )}
                <div className="w-5 h-5 rounded-full bg-[#FFC600] flex justify-center items-center mr-2">
                  {panelProps.isActive ? (
                    <RxChevronUp className="w-4 h-4 text-black" />
                  ) : (
                    <RxChevronDown className="w-4 h-4 text-black" />
                  )}
                </div>
              </div>
            );
          }}
        />
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center gap-1.5 py-12">
          <p
            className="text-[#163986] uppercase font-semibold"
            style={{
              fontSize:
                windowDimension.width < 425
                  ? "18px"
                  : windowDimension.width < 768
                    ? "18px"
                    : windowDimension.width < 1024
                      ? "19px"
                      : windowDimension.width < 1225
                        ? "19px"
                        : windowDimension.width < 1440
                          ? "20px"
                          : "20px",
            }}>
            {t("No modules available")}
          </p>
          <p
            className="text-[#163986] font-light text-center"
            style={{
              fontSize:
                windowDimension.width < 425
                  ? "14px"
                  : windowDimension.width < 768
                    ? "14px"
                    : windowDimension.width < 1024
                      ? "15px"
                      : windowDimension.width < 1225
                        ? "15px"
                        : windowDimension.width < 1440
                          ? "16px"
                          : "16px",
            }}>
            {t(
              "This course currently has no modules. Please check back later.",
            )}
          </p>
        </div>
      )}
    </div>
  );
}
