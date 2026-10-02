import axios from "axios";
import { useContext } from "react";
import { Collapse, Empty, Tooltip } from "antd";
import { LuCheck, LuCircleCheck, LuRotateCcw } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import { usePermission } from "../../../utils/usePermission";
import { useConfirm } from "../confirmModal";

const Dot = ({ done }) => (
  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${done ? "border-[#2F8351] bg-[#2F8351] text-white" : "border-[#C9D1E3] bg-white"}`}>
    {done && <LuCheck className="text-[12px]" />}
  </span>
);

// Nome do curso/módulo/item sobre o qual se pede a confirmação
const ItemBox = ({ title }) => (title ? <div className="rounded-[10px] bg-[#F6F7F9] p-3 text-[13px] font-bold">{title}</div> : null);

const IconButton = ({ title, onClick, children, hover }) => (
  <Tooltip title={title}>
    <button
      type="button"
      aria-label={title}
      onClick={onClick}
      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] border-0 bg-transparent text-[#8A8D98] ${hover}`}>
      {children}
    </button>
  </Tooltip>
);

// Progresso do aluno módulo a módulo. Quem pode editar cursos pode repor o progresso a partir de um item ou
// completá-lo em nome do aluno (um item, um módulo ou o curso todo).
export default function ModuleProgress({ course, student, onChange }) {
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const { canUpdate } = usePermission("course");
  const [confirm, confirmHolder] = useConfirm();

  const isDone = (type, id) => course.progress.some((p) => p.is_completed === 1 && p.activity_type === type && p[`id_course_${type}`] === id);
  const isModuleDone = (module) => course.progress.some((p) => p.activity_type === "module" && p.id_course_module === module.id);
  const allDone = course.modules.every((m) => (m.items ?? []).every((i) => isDone(i.type, i.id)));

  // Repõe o progresso deste item e de todos os seguintes
  function askReset(module, item) {
    confirm({
      tone: "warning",
      title: t("Reset progress"),
      description: t("This item and the following ones will be marked as not done. Continue?"),
      okText: t("Reset"),
      children: <ItemBox title={item.title} />,
      onOk: () => resetFrom(module, item),
    });
  }

  function resetFrom(module, item) {
    const itemsToRemove = course.allItems.slice(course.allItems.findIndex((i) => i.id === item.id && i.type === item.type));
    const modulesToRemove = course.modules.slice(course.modules.findIndex((m) => m.id === module.id));
    return axios
      .post(endpoints.course.resetProgress, {
        data: { user: student, module: modulesToRemove, items: itemsToRemove, course: course.course, tests: course.allItems.filter((i) => i.type === "test") },
      })
      .then(() => {
        toastApi.success(t("Progress reset successfully"));
        onChange?.();
      })
      .catch((err) => {
        console.log(err);
        toastApi.error(t("Could not reset the progress"));
      });
  }

  // scope: "item" (um tópico/teste), "module" ou "course"
  function askComplete(scope, module, item) {
    const texts = {
      item: { title: t("Mark as completed"), description: t("This item will be marked as completed for this student. Continue?"), name: item?.title },
      module: { title: t("Complete the module"), description: t("All the items of this module will be marked as completed. Continue?"), name: module?.title },
      course: { title: t("Complete the course"), description: t("All the items of this course will be marked as completed for this student. Continue?"), name: course.course.name },
    }[scope];
    confirm({ tone: "success", title: texts.title, description: texts.description, okText: t("Complete"), children: <ItemBox title={texts.name} />, onOk: () => complete(scope, module, item) });
  }

  function complete(scope, module, item) {
    return axios
      .post(endpoints.course.completeProgress, {
        data: { id_user: student.id, id_course: course.course.id, scope, id_module: module?.id, item: item ? { type: item.type, id: item.id } : undefined },
      })
      .then(() => {
        toastApi.success(t("Progress completed successfully"));
        onChange?.();
      })
      .catch((err) => {
        console.log(err);
        toastApi.error(err.response?.data?.message || t("Could not complete the progress"));
      });
  }

  if (course.modules.length === 0) return <Empty description={t("No modules")} />;

  return (
    <div className="flex flex-col gap-3">
      {confirmHolder}
      {canUpdate && !allDone && (
        <div className="flex justify-end">
          <IconButton title={t("Complete the course")} onClick={() => askComplete("course")} hover="hover:bg-[#E8F5EC] hover:text-[#2F8351]">
            <LuCircleCheck className="text-[18px]" />
          </IconButton>
        </div>
      )}
      {course.modules.map((module) => {
        const items = module.items ?? [];
        const doneCount = items.filter((i) => isDone(i.type, i.id)).length;
        const moduleComplete = items.length > 0 && doneCount === items.length;
        return (
          <Collapse
            key={module.id}
            className="user-module-collapse"
            expandIconPlacement="end"
            items={[
              {
                key: module.id,
                label: (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Dot done={isModuleDone(module) || moduleComplete} />
                      <div className="min-w-0">
                        <p className="mb-0! font-bold text-[14px] truncate">{module.title}</p>
                        <p className="mb-0! text-[12px] text-[#8A8D98]">{t("{{done}} of {{total}} items completed", { done: doneCount, total: items.length })}</p>
                      </div>
                    </div>
                    {canUpdate && !moduleComplete && items.length > 0 && (
                      // stopPropagation: o ícone não deve abrir/fechar o módulo
                      <span onClick={(e) => e.stopPropagation()}>
                        <IconButton title={t("Complete the module")} onClick={() => askComplete("module", module)} hover="hover:bg-[#E8F5EC] hover:text-[#2F8351]">
                          <LuCircleCheck className="text-[18px]" />
                        </IconButton>
                      </span>
                    )}
                  </div>
                ),
                children: (
                  <div className="flex flex-col">
                    {items.map((item, i) => {
                      const done = isDone(item.type, item.id);
                      return (
                        <div key={`${item.type}-${item.id}`} className={`flex items-center justify-between gap-3 py-2.5 ${i < items.length - 1 ? "border-0 border-b border-solid border-[#EEF0F5]" : ""}`}>
                          <div className="flex min-w-0 items-center gap-3">
                            <Dot done={done} />
                            <p className="mb-0! text-sm truncate">{item.title}</p>
                            <span className="rounded-full bg-[#F2F3F5] px-2 py-0.5 text-[11px] text-[#5B5F6B]">{item.type === "test" ? t("Test") : t("Topic")}</span>
                          </div>
                          {canUpdate && (
                            <div className="flex shrink-0 items-center">
                              {!done && (
                                <IconButton title={t("Mark as completed")} onClick={() => askComplete("item", module, item)} hover="hover:bg-[#E8F5EC] hover:text-[#2F8351]">
                                  <LuCircleCheck />
                                </IconButton>
                              )}
                              {done && (
                                <IconButton title={t("Reset progress from here")} onClick={() => askReset(module, item)} hover="hover:bg-[#FFF4E5] hover:text-[#E67E00]">
                                  <LuRotateCcw />
                                </IconButton>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ),
              },
            ]}
          />
        );
      })}
    </div>
  );
}
