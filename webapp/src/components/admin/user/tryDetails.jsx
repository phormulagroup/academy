import { Drawer, Tag } from "antd";
import dayjs from "dayjs";
import { LuCheck, LuX } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import { formatSeconds } from "../../../utils/userResults";

const asArray = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);

const Stat = ({ label, value }) => (
  <div className="flex flex-col items-center rounded-[10px] bg-[#F6F7F9] px-3 py-2">
    <p className="mb-0! text-[11px] text-[#8A8D98]">{label}</p>
    <p className="mb-0! text-sm font-bold">{value}</p>
  </div>
);

// Detalhes de uma tentativa de teste: resultado e, pergunta a pergunta, o que o aluno respondeu e qual era a resposta certa
export default function TryDetails({ row, number, testTitle, open, onClose }) {
  const { t } = useTranslation();
  const items = row?.items ?? [];

  return (
    <Drawer open={open} onClose={onClose} size={640} destroyOnHidden title={`${testTitle ?? t("Test")} · ${t("Try")} #${number}`}>
      {row && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label={t("Result")} value={<Tag color={row.is_completed ? "green" : "red"} className="m-0!">{row.is_completed ? t("Passed") : t("Not passed")}</Tag>} />
            <Stat label={t("Correct")} value={`${row.correct}/${row.totalAnswers}`} />
            <Stat label={t("Time")} value={formatSeconds(row.seconds)} />
            <Stat label={t("Date")} value={dayjs(row.created_at).format("DD/MM/YYYY HH:mm")} />
          </div>

          {items.length === 0 ? (
            <p className="py-6 text-center text-[#8A8D98]">{t("There are no answers recorded for this try")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((question, index) => {
                const mine = asArray(question.myAnswer);
                return (
                  <div key={index} className={`rounded-[12px] border border-solid p-4 ${question.is_correct ? "border-[#2F8351]/40 bg-[#F4FAF6]" : "border-[#DB0709]/30 bg-[#FEF6F6]"}`}>
                    <div className="mb-3 flex items-start gap-3">
                      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${question.is_correct ? "bg-[#2F8351]" : "bg-[#DB0709]"}`}>
                        {question.is_correct ? <LuCheck /> : <LuX />}
                      </span>
                      <p className="mb-0! text-[14px] font-bold">
                        {index + 1}. {question.title}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 pl-9">
                      {asArray(question.answer).map((option, i) => {
                        const picked = mine.includes(option.title);
                        const right = !!option.is_correct;
                        return (
                          <div
                            key={i}
                            className={`flex items-center justify-between gap-3 rounded-[8px] px-3 py-2 text-[13px] ${
                              right ? "bg-[#E1F2E7] text-[#1F6B3E]" : picked ? "bg-[#FBE1E1] text-[#A30507]" : "bg-white text-[#5B5F6B]"
                            }`}>
                            <span>{option.title}</span>
                            <span className="flex shrink-0 items-center gap-2 text-[11px] font-medium">
                              {picked && <span className="rounded-full bg-white/70 px-2 py-0.5">{t("Student's answer")}</span>}
                              {right && <span className="rounded-full bg-white/70 px-2 py-0.5">{t("Correct answer")}</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
