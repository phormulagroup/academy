import { useContext } from "react";
import config from "../../../utils/config";
import { PiBookBookmark } from "react-icons/pi";
import { Context } from "../../../utils/context";

export default function CourseMaterial({ data }) {
  const { t, windowDimension } = useContext(Context);

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
            {t("No materials available")}
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
            {t("Please check back later for materials.")}
          </p>
        </div>
      )}
    </div>
  );
}
