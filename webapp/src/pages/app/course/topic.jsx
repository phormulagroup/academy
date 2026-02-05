import { useTranslation } from "react-i18next";
import { Render } from "@puckeditor/core";
import { configRender } from "../../../components/editor";

const Topic = ({ selectedCourseItem, progress, progressPercentage }) => {
  const { t } = useTranslation();
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
