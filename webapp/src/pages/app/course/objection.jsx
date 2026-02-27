import { useTranslation } from "react-i18next";
import MaterialIcon from "../../../assets/Materiais.svg?react";
import config from "../../../utils/config";

export default function CourseObjection({ data }) {
  const { t } = useTranslation();

  function downloadFile(item) {
    window.open(`${config.server_ip}/media/${item.file}`, "_blank");
  }

  return (
    <div className="p-2">
      {data.objection && data.objection.length > 0 ? (
        <div className="flex flex-col">
          {data.objection.map((m, i) => (
            <div key={i} className="flex items-center border border-gray-300 rounded-lg p-4 mb-4 cursor-pointer hover:bg-gray-100" onClick={() => downloadFile(m)}>
              <MaterialIcon className="w-[25px] h-[25px] mr-2" />
              <p className="text-lg font-semibold">{m.file}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No objections available.</p>
      )}
    </div>
  );
}
