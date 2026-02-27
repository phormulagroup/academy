import { useTranslation } from "react-i18next";
import { Render } from "@puckeditor/core";
import { configRender } from "../../../components/admin/editor";
import { useEffect, useRef, useState } from "react";

import Player from "@vimeo/player";
import { RxLockClosed } from "react-icons/rx";

const Topic = ({ course, selectedCourseItem, progress, progressPercentage, setAllowNext, modules, allItems }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isTopicLocked, setIsTopicLocked] = useState(false);
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setAllowNext(false);
    setIsTopicLocked(false);

    if (selectedCourseItem.type === "topic") {
      const iframe = document.querySelector('iframe[src*="player.vimeo.com"]');
      // If the topic is already completed, allow to go to the next topic/test
      if (progress.filter((p) => p.activity_type === "topic" && p.id_course_topic === selectedCourseItem.id).length > 0) {
        setAllowNext(true);
        return;
      }

      // If the test progress is free, allow to go to the next topic/test
      if (!course.settings || (course.settings && course.settings.progression_type === "free")) {
        if (!iframe) {
          setAllowNext(true);
          return;
        } else {
          setAllowNext(false);
        }
      }

      if (course.settings && course.settings.progression_type === "linear") {
        let findIndex = allItems.findIndex((i) => i.id === selectedCourseItem.id && i.type === selectedCourseItem.type);
        if (findIndex === 0) {
          if (!iframe) {
            setAllowNext(true);
            return;
          } else {
            setAllowNext(false);
          }
        } else {
          let previousItem = allItems[findIndex - 1];
          let previousCompleted = progress.filter(
            (p) =>
              p.is_completed === 1 &&
              ((p.activity_type === "topic" && p.id_course_topic === previousItem.id) || (p.activity_type === "test" && p.id_course_test === previousItem.id)),
          ).length;

          if (previousCompleted > 0) {
            if (!iframe) {
              setAllowNext(true);
              return;
            } else {
              setAllowNext(false);
            }
          } else {
            setAllowNext(false);
            setIsTopicLocked(true);
          }
        }
      }

      if (iframe) {
        const player = new Player(iframe);
        let curtime = 0;

        player.on("timeupdate", function (data) {
          if (data.seconds < curtime + 1 && data.seconds > curtime) {
            curtime = data.seconds;
          }
        });

        player.on("seeked", function (data) {
          if (data.seconds > curtime) {
            player.setCurrentTime(curtime);
          }
        });

        player.on("ended", () => {
          console.log("ended");
          setAllowNext(true);
          setIsVideoCompleted(true);
        });
      }
    }
  });

  useEffect(() => {
    setIsVideoCompleted(false);
  }, [selectedCourseItem]);

  useEffect(() => {
    if (isVideoCompleted) setAllowNext(true);
  }, [isVideoCompleted]);

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
            <p className="text-[26px] text-black font-bold">{selectedCourseItem.title}</p>
          )}
          {isTopicLocked ? (
            <div className="p-4 flex items-center bg-[#FF7D5A] text-white mt-4">
              <RxLockClosed className="w-10 h-10 mr-2" />
              <div>
                <p className="text-[20px] font-bold">{t("This topic is locked")}</p>
                <p>{t("You'll need to complete the previous topic first")}</p>
              </div>
            </div>
          ) : (
            <Render key={selectedCourseItem.id} config={configRender} data={selectedCourseItem.content ? JSON.parse(selectedCourseItem.content) : {}} />
          )}
        </div>
      </div>
    </div>
  );
};
export default Topic;
