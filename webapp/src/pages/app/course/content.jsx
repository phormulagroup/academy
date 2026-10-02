import { Collapse, Tooltip } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { RxChevronUp, RxChevronDown, RxCheck } from "react-icons/rx";
import { FaListCheck } from "react-icons/fa6";
import { PiFileTextLight } from "react-icons/pi";
import i18n from "../../../utils/i18n";
import { Context } from "../../../utils/context";

export default function CourseContent({ modules, progress, data, courseSlug }) {
  const { t } = useTranslation();
  const { windowDimension } = useContext(Context);

  // No detalhe do curso o slug vem do URL; nos Resultados cada curso passa o seu (courseSlug)
  const { slug: routeSlug } = useParams();
  const slug = courseSlug ?? routeSlug;

  const navigate = useNavigate();

  // Verifica se o utilizador está inscrito no curso ou já completou
  const isEnrolled =
    progress.filter((p) => p.activity_type === "enroll" && p.is_completed === 1)
      .length > 0;

  const isCourseCompleted =
    progress.filter((p) => p.activity_type === "course" && p.is_completed === 1)
      .length > 0;

  const canAccess = isEnrolled || isCourseCompleted;

  // Sem inscrição os itens ficam com cursor "proibido": tooltip a explicar porquê
  function withLockTooltip(node, key) {
    if (canAccess) return node;
    return (
      <Tooltip
        key={key}
        title={t("You need to enroll in the course first to access the e-Learning")}>
        {node}
      </Tooltip>
    );
  }

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

      // Tamanho intermédio: entre o título do módulo e os itens (igual ao "Module content")
      return (
        <p className="font-ryker text-[#FFFFFF] text-[13px] sm:text-[14px] lg:text-[15px]">
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
                  {withLockTooltip(<div
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
                        className={`font-ryker text-[#163986] font-bold text-[14px] sm:text-[15px] lg:text-[16px] xl:text-[17px] line-clamp-2 w-full overflow-hidden`}>
                        {item.title}
                      </p>
                      <p className="mt-1 text-[#163986] text-[12px] lg:text-[13px] line-clamp-2">
                        {data?.topics &&
                        data.topics.filter(
                          (_t) => _t.id_course_module === item.id,
                        ).length > 0
                          ? `${data.topics.filter((_t) => _t.id_course_module === item.id).length} ${t("topic")} ${data?.tests.length > 0 && data.tests.filter((_t) => _t.id_course_module === item.id).length > 0 ? " | " : ""}`
                          : ""}{" "}
                        {` ${data?.tests.length > 0 && data.tests.filter((_t) => _t.id_course_module === item.id).length > 0 ? `${data.tests.filter((_t) => _t.id_course_module === item.id).length} ${t("test")}` : ""}`}
                      </p>
                    </div>
                  </div>)}
                </div>
              ),
              children: (
                <div className="flex flex-col">
                  {/* Mobile (< 768px): "Module content" e o progresso num só bloco compacto */}
                  {windowDimension.width < 768 && (
                    <div className="p-3 sm:p-4 bg-[#FF9E83] flex flex-col justify-center items-center gap-1">
                      <div className="flex items-center gap-2 justify-center">
                        {windowDimension.width >= 600 && (
                          <PiFileTextLight className="text-[#FFFFFF] w-5 h-5 sm:w-6 sm:h-6" />
                        )}
                        <p className="font-ryker text-[#FFFFFF] font-bold text-[13px] sm:text-[14px] lg:text-[15px]">
                          {t("Module content")}
                        </p>
                      </div>
                      <div className="text-center text-white font-bold">
                        {calcProgress(item.items)}
                      </div>
                    </div>
                  )}

                  {/* Desktop (768px+): ícone + label + progresso na mesma linha */}
                  {windowDimension.width >= 768 && (
                    <div className="flex px-4 py-3 lg:px-5 bg-[#FF9E83] justify-between items-center gap-4">
                      <div className="flex items-center gap-3">
                        <PiFileTextLight className="text-[#FFFFFF] w-5 h-5 xl:w-6 xl:h-6" />
                        <p className="font-ryker text-[#FFFFFF] font-bold text-[13px] sm:text-[14px] lg:text-[15px]">
                          {t("Module content")}
                        </p>
                      </div>
                      <div>{calcProgress(item.items)}</div>
                    </div>
                  )}
                  <div className="p-2 sm:p-4">
                    {item.items && item.items.length > 0 ? (
                      item.items.map((_t, i) => withLockTooltip(
                        <div
                          key={`${_t.type}-${_t.id}`}
                          onClick={() => handleNavigate(_t.id, _t.type)}
                          // Itens mais pequenos que o título do módulo e que o "Module content"/progresso
                          className={`group p-3 pl-4 sm:pl-6 lg:py-3.5 flex items-center gap-3 sm:gap-4 text-[12px] sm:text-[13px] xl:text-[14px] ${canAccess ? "cursor-pointer hover:bg-[#FF9E83]" : "cursor-not-allowed opacity-50"} ${i < item.items.length - 1 ? "border-b border-[#969696]" : ""} transition-all`}>
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
                            <FaListCheck
                              className={`shrink-0 w-4 h-4 sm:w-5 sm:h-5 transition-colors ${canAccess ? "text-[#163986] group-hover:text-[#FFFFFF]" : "text-[#163986] opacity-50"}`}
                            />
                          )}
                          {/* Item title */}
                          <p
                            className={`text-[#163986] font-medium transition-colors line-clamp-2 w-full ${canAccess ? "group-hover:text-[#FFFFFF] group-hover:font-bold" : ""}`}>
                            {_t.title}
                          </p>
                        </div>,
                        `${_t.type}-${_t.id}`,
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
                      <p className="font-bold text-[#163986] text-[13px] xl:text-[14px]">
                        {t("Collapse")}
                      </p>
                    ) : (
                      <p className="font-bold text-[#163986] text-[13px] xl:text-[14px]">
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
      ) : null}
    </div>
  );
}
