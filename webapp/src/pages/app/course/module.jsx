import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";

import Player from "@vimeo/player";
import { RxLockClosed } from "react-icons/rx";
import { AiOutlineCheck } from "react-icons/ai";

const Module = ({ selectedCourseItem, progress, selectCourseItem, modules, allItems }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isTopicLocked, setIsTopicLocked] = useState(false);
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setIsTopicLocked(false);
  }, [selectedCourseItem]);

  return (
    <div>
      <div className="flex justify-between flex-col h-full">
        <div className="p-8 overflow-y-auto">
          {progress.length > 0 && progress.filter((p) => p.activity_type === "module" && p.id_course_module === selectedCourseItem.id).length > 0 ? (
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
            <div>
              {modules
                .filter((m) => m.id === selectedCourseItem.id)[0]
                ?.items.map((item) => {
                  console.log(item);
                  return (
                    <div className="p-4 border-solid border-1 border-[#000] mt-4 flex items-center cursor-pointer" onClick={() => selectCourseItem(item)}>
                      {progress.length > 0 && progress.filter((p) => p.id_course_topic === item.id || p.id_course_test === item.id).length > 0 ? (
                        <div className={`w-6.25 h-6.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center`}>
                          <AiOutlineCheck className="text-white" />
                        </div>
                      ) : (
                        <div className={`w-6.25 h-6.25 rounded-full bg-white border border-[#2F8351]`}></div>
                      )}
                      <p className="text-[14px] ml-2">{item.title}</p>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Module;
