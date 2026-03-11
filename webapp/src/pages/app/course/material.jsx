import { useTranslation } from "react-i18next";
import MaterialIcon from "../../../assets/Materiais.svg?react";
import config from "../../../utils/config";

export default function CourseMaterial({ data }) {
  const { t } = useTranslation();

  function downloadFile(item) {
    window.open(`${config.server_ip}/media/${item.file}`, "_blank");
  }

  return (
    <div className="mb-10">
      {data.material && data.material.length > 0 ? (
        <div className="flex flex-col">
          {data.material.map((m, i) => (
            <div key={i} className="flex items-center border border-gray-300 p-4 mb-4 cursor-pointer hover:bg-gray-100 rounded-[5px]" onClick={() => downloadFile(m)}>
              <MaterialIcon className="w-[20px] h-[20px] mr-2" />
              <p className="text-[16px]">{m.file}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No materials available.</p>
      )}
    </div>
  );
}
