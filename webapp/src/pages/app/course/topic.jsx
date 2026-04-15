import { useTranslation } from "react-i18next";
import { Render } from "@puckeditor/core";
import { configRender } from "../../../components/admin/editor";
import { useEffect, useMemo, useRef, useState } from "react";

import Player from "@vimeo/player";
import { RxLockClosed } from "react-icons/rx";
import PuckRender from "../../../components/app/puckRender";
import { Helmet } from "react-helmet";

const Topic = ({ course, selectedCourseItem, progress, progressPercentage, setAllowNext, modules, allItems, collapsed }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isTopicLocked, setIsTopicLocked] = useState(false);
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);
  const [seo, setSeo] = useState({});
  const { t } = useTranslation();

  const playerRef = useRef(null);

  useEffect(() => {
    setAllowNext(false);
    setIsTopicLocked(false);
    setIsVideoCompleted(false);

    if (selectedCourseItem.type !== "topic") return;
    const iframe = document.querySelector('iframe[src*="player.vimeo.com"]');

    // If the topic is already completed, allow to go to the next topic/test
    if (progress.filter((p) => p.activity_type === "topic" && p.id_course_topic === selectedCourseItem.id).length > 0) {
      setAllowNext(true);
      return;
    }

    // If the course progress is free, allow to go to the next topic/test
    if (!course.settings || (course.settings && course.settings.progression_type === "free")) {
      if (!iframe) {
        setAllowNext(true);
        return;
      } else {
        setAllowNext(false);
      }
    }

    //If the course progress is linear
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
      //let curtime = videoTimeWatched ?? 0;
      let curtime = 0;
      playerRef.current = player;

      /*if (videoTimeWatched > 0) {
        player.setCurrentTime(videoTimeWatched);
      }*/

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
        setAllowNext(true);
        setIsVideoCompleted(true);
      });
    }
  }, [selectedCourseItem]);

  const parsedContent = useMemo(() => {
    const resp = selectedCourseItem.content ? JSON.parse(selectedCourseItem.content) : {};
    setSeo({ title: resp?.root?.props?.title || null, description: resp?.root?.props?.description || null, heroImage: resp?.root?.props?.heroImage?.url || null });
    return resp;
  }, [selectedCourseItem.content]);

  useEffect(() => {
    setIsVideoCompleted(false);
  }, [selectedCourseItem]);

  useEffect(() => {
    console.log(seo);
  }, [seo]);

  useEffect(() => {
    if (isVideoCompleted) setAllowNext(true);
  }, [isVideoCompleted]);

  return (
    <div>
      <Helmet>
        <meta charSet="utf-8" />
        <title>{seo.title ?? selectedCourseItem.title}</title>
        <meta name="description" content={seo.description ?? selectedCourseItem.title} />
        <meta property="og:title" content={seo.title ?? selectedCourseItem.title} />
        <meta property="og:description" content={seo.description ?? selectedCourseItem.title} />
        {seo.heroImage?.url && <meta property="og:image" content={seo.heroImage?.url} />}
      </Helmet>
      <div className="flex justify-between flex-col h-full">
        <div className="overflow-y-auto">
          {isTopicLocked ? (
            <div className="p-4 flex items-center bg-[#FF7D5A] text-white mt-4">
              <RxLockClosed className="w-10 h-10 mr-2" />
              <div>
                <p className="text-[20px] font-bold">{t("This topic is locked")}</p>
                <p>{t("You'll need to complete the previous topic first")}</p>
              </div>
            </div>
          ) : (
            <PuckRender config={configRender} data={parsedContent} />
          )}
        </div>
      </div>
    </div>
  );
};
export default Topic;
