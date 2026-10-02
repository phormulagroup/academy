import { Table } from "antd";
import { useTranslation } from "react-i18next";

function ExportData({ data, columns, columnMapping = {}, translate }) {
  const { t } = useTranslation();

  const filteredColumns = columns
    .map((col) => ({
      ...col,
      title: col.dataIndex === "attempt_number" ? "attempt_number" : columnMapping[col.dataIndex] || col.title, // Use mapped title or fallback to original
      width: col.dataIndex.includes("question") || col.dataIndex.includes("answer") ? 300 :
        col.dataIndex.includes("course_name") || col.dataIndex.includes("course") || col.dataIndex.includes("test_name") ? 150 : col.width,
    })); // Aplica widths específicas conforme configuração
  return (
    <div className="flex flex-col justify-center items-center p-2">
      <p className="blue text-[20px] mt-6 font-ryker">{t("To be exported")}:</p>
      <p className="font-bold blue text-[40px] mt-2 mb-2 font-ryker">{data.length}</p>
      <Table
        columns={filteredColumns}
        dataSource={data}
        scroll={{ x: "max-content" }}
        pagination={{
          pageSize: 5, // máximo 5 por página
          position: ["bottomCenter"], // paginação ao centro
        }}
      />
    </div>
  );
}

export default ExportData;
