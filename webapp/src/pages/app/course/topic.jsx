import { useTranslation } from "react-i18next";
import { Render } from "@puckeditor/core";
import { configRender } from "../../../components/editor";
import { useEffect, useRef } from "react";

import Player from "@vimeo/player";

const Topic = ({ selectedCourseItem, progress, progressPercentage, setAllowNext }) => {
  const { t } = useTranslation();

  useEffect(() => {
    setAllowNext(false);
    if (selectedCourseItem.type === "topic") {
      const iframe = document.querySelector('iframe[src*="player.vimeo.com"]');

      if (!iframe) {
        setAllowNext(true);
        return;
      }
      let maxTime = 0; // tempo máximo que o utilizador já viu

      const player = new Player(iframe);

      // Obter duração
      player.getDuration().then((duration) => {
        console.log("Duração total:", duration);
      });

      let curtime = 0;

      player.on("timeupdate", function (data) {
        if (data.seconds < curtime + 1 && data.seconds > curtime) {
          // Above is where I hack it.
          //I only update the current time if the timeupdate is less than a second ago
          //(therefore proabaly not seeked to).  This stops the function from just updating curtime to the seeked time.  But I feel it's not the best way.
          curtime = data.seconds;
        }
      });

      player.on("seeked", function (data) {
        if (data.seconds > curtime) {
          player.setCurrentTime(curtime);
        }
      });

      player.on("ended", () => {
        console.log("Vídeo terminou!");
        setAllowNext(true);
      });

      return () => player.destroy();
    }
  }, [selectedCourseItem]);

  return (
    <div>
      <div className="flex justify-between flex-col h-full">
        <div className="p-8 overflow-y-auto">
          {progress.length > 0 &&
          progress.filter(
            (p) => (p.activity_type === "topic" || p.activity_type === "test") && (p.id_course_topic === selectedCourseItem.id || p.id_course_test === selectedCourseItem.id),
          ).length > 0 ? (
            <div className="p-4 bg-black flex justify-between items-center">
              <p className="text-[20px] text-white">{selectedCourseItem.title}</p>
              <div className="p-4 bg-[#2F8351]">
                <p className="text-white text-[16px]">{t("Completed")}</p>
              </div>
            </div>
          ) : (
            <p className="text-[20px] text-black font-bold">{selectedCourseItem.title}</p>
          )}

          <Render config={configRender} data={selectedCourseItem.content ? JSON.parse(selectedCourseItem.content) : {}} />
        </div>
      </div>
    </div>
  );
};
export default Topic;
