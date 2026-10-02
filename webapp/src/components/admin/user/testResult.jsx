import axios from "axios";
import { useContext, useState } from "react";
import { Empty, Table, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { LuEye, LuTrash2 } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import { usePermission } from "../../../utils/usePermission";
import { formatSeconds, testResult } from "../../../utils/userResults";
import { useConfirm } from "../confirmModal";
import TryDetails from "./tryDetails";

const STATUS = {
  passed: { label: "Passed", color: "green" },
  not_passed: { label: "Not passed", color: "red" },
  in_progress: { label: "In progress", color: "blue" },
  not_started: { label: "Not started", color: "default" },
};

const Meta = ({ label, value }) => (
  <div className="flex flex-col items-center rounded-[10px] bg-[#F6F7F9] px-3 py-2">
    <p className="mb-0! text-[11px] text-[#8A8D98]">{label}</p>
    <p className="mb-0! text-sm font-bold">{value}</p>
  </div>
);

// Um teste do curso: estado, definições e as tentativas do aluno
export default function TestResult({ course, test, onChange }) {
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const { canUpdate } = usePermission("course");
  const [confirm, confirmHolder] = useConfirm();
  const [detail, setDetail] = useState(null); // { row, number }
  const result = testResult(course, test);
  const status = STATUS[result.status];

  function deleteTry(row, number) {
    confirm({
      tone: "danger",
      title: t("Delete try"),
      description: t("Are you sure you want to delete this try?"),
      okText: t("Delete"),
      children: (
        <div className="rounded-[10px] bg-[#F6F7F9] p-3 text-[13px]">
          <p className="mb-1!">
            <b>{test.title}</b>
          </p>
          <p className="mb-0! text-[#5B5F6B]">
            {t("Try")} #{number} · {dayjs(row.created_at).format("DD/MM/YYYY HH:mm")}
          </p>
        </div>
      ),
      onOk: () =>
        axios
          .post(endpoints.course.deleteTry, { data: { id: row.id } })
          .then((res) => {
            if (res.data.affectedRows > 0) {
              toastApi.success(t("Try deleted successfully"));
              onChange?.();
            }
          })
          .catch((err) => {
            console.log(err);
            toastApi.error(t("Could not delete the try"));
          }),
    });
  }

  return (
    <div className="rounded-[14px] border border-solid border-[#E5E7EB] bg-white p-4">
      {confirmHolder}
      <TryDetails row={detail?.row} number={detail?.number} testTitle={test.title} open={!!detail} onClose={() => setDetail(null)} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="mb-0! font-bold text-[15px]">{test.title}</p>
        <Tag color={status.color} className="m-0!">
          {t(status.label)}
        </Tag>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Meta label={t("Tries")} value={`${result.tries.length}/${result.maxTries}`} />
        <Meta label={t("Questions")} value={result.questions} />
        <Meta label={t("Time")} value={result.time != null ? `${result.time} min` : "-"} />
        <Meta label={t("Passing score")} value={`${result.passingScore}%`} />
      </div>
      {result.tries.length > 0 ? (
        <Table
          size="small"
          pagination={false}
          rowKey="id"
          scroll={{ x: 520 }}
          dataSource={result.tries}
          columns={[
            { title: t("Try"), key: "n", width: 70, render: (_, __, i) => `#${i + 1}` },
            { title: t("Result"), key: "result", render: (_, row) => <Tag color={row.is_completed ? "green" : "red"}>{row.is_completed ? t("Passed") : t("Not passed")}</Tag> },
            { title: t("Correct"), key: "correct", render: (_, row) => `${row.correct}/${row.totalAnswers}` },
            { title: t("Time"), key: "time", render: (_, row) => formatSeconds(row.seconds) },
            { title: t("Date"), key: "date", render: (_, row) => dayjs(row.created_at).format("DD/MM/YYYY HH:mm") },
            {
              title: "",
              key: "actions",
              width: 90,
              render: (_, row, index) => (
                <div className="flex items-center justify-end gap-1">
                  <Tooltip title={t("View details")}>
                    <button type="button" aria-label={t("View details")} onClick={() => setDetail({ row, number: index + 1 })} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] border-0 bg-transparent text-[#8A8D98] hover:bg-[#E6F9FC] hover:text-[#163986]">
                      <LuEye />
                    </button>
                  </Tooltip>
                  {canUpdate && (
                    <Tooltip title={t("Delete try")}>
                      <button type="button" aria-label={t("Delete try")} onClick={() => deleteTry(row, index + 1)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] border-0 bg-transparent text-[#8A8D98] hover:bg-[#FDECEC] hover:text-[#DB0709]">
                        <LuTrash2 />
                      </button>
                    </Tooltip>
                  )}
                </div>
              ),
            },
          ]}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("No tries made yet")} />
      )}
    </div>
  );
}
