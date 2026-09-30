import config from "../../../utils/config";
import { PiBookBookmark } from "react-icons/pi";

export default function CourseMaterial({ data }) {
  function downloadFile(item) {
    window.open(`${config.server_ip}/media/${item.file}`, "_blank");
  }

  return (
    <div className="mb-10">
      {data.material && data.material.length > 0 ? (
        <div className="flex flex-col">
          {data.material
            .filter((m) => m.file) // Filtrar materiais sem arquivo associado
            .map((m, i) => (
              <div
                key={i}
                className="group flex items-center border border-[#00B9D6]/80 bg-[#00B9D6]/10 hover:bg-[#FFFFFF] p-4 mb-4 cursor-pointer rounded-[5px] transition-colors"
                onClick={() => downloadFile(m)}>
                <div className="text-[#00B9D6] p-1 rounded mr-2 transition-colors">
                  <PiBookBookmark className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
                <p className="text-[#00B9D6] font-bold transition-colors text-sm sm:text-base md:text-lg">
                  {m.name || m.file}
                </p>
              </div>
            ))}
        </div>
      ) : null}
    </div>
  );
}
