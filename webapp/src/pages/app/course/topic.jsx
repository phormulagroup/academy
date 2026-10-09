import { useTranslation } from "react-i18next";
import { configRender } from "../../../components/admin/editor";
import { useContext, useEffect, useMemo, useRef, useState } from "react";

import Player from "@vimeo/player";
import LockedMessage from "../../../components/app/course/lockedMessage";
import PuckRender from "../../../components/app/puckRender";
import { Helmet } from "react-helmet";
import { Context } from "../../../utils/context";
import { hasFullAccess } from "../../../utils/roles";

const Topic = ({
  course,
  selectedCourseItem,
  progress,
  setAllowNext,
  allItems,
}) => {
  const [isTopicLocked, setIsTopicLocked] = useState(false);
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);
  const [seo, setSeo] = useState({});
  const { t } = useTranslation();
  const { user } = useContext(Context);
  // Admin (id_role = 1) sem restrições; aluno (id_role = 2) com navegação linear e vídeos obrigatórios
  const isAdmin = hasFullAccess(user);

  const playerRef = useRef(null);

  useEffect(() => {
    setAllowNext(false);
    setIsTopicLocked(false);
    setIsVideoCompleted(false);

    if (selectedCourseItem.type !== "topic") return;

    const isCompleted = progress.some(
      (p) =>
        p.activity_type === "topic" &&
        p.id_course_topic === selectedCourseItem.id &&
        p.is_completed === 1 &&
        p.is_deleted !== 1,
    );

    // Admin: navegação livre, não precisa de ver os vídeos. Tópico já concluído: pode avançar e rever à vontade
    if (isAdmin || isCompleted) {
      setAllowNext(true);
      return;
    }

    // Aluno, navegação linear: o tópico fica bloqueado enquanto o item anterior não estiver concluído
    if (course.settings?.progression_type === "linear") {
      const findIndex =
        allItems?.findIndex(
          (i) =>
            i.id === selectedCourseItem.id &&
            i.type === selectedCourseItem.type,
        ) ?? -1;
      if (findIndex > 0) {
        const previousItem = allItems[findIndex - 1];
        const previousCompleted = progress.some(
          (p) =>
            p.is_completed === 1 &&
            p.is_deleted !== 1 &&
            p.activity_type === previousItem.type &&
            p[`id_course_${previousItem.type}`] === previousItem.id,
        );
        if (!previousCompleted) {
          setIsTopicLocked(true);
          return;
        }
      }
    }

    // Sem vídeos no conteúdo do tópico: pode avançar
    if (!(selectedCourseItem.content || "").includes("player.vimeo.com")) {
      setAllowNext(true);
      return;
    }

    // Vídeos (Vimeo): o aluno tem de ver todos até ao fim para avançar; se tentar avançar o tempo do
    // vídeo para a frente, o vídeo volta sempre ao início
    let players = [];
    let retryTimer = null;
    const attachPlayers = (tries = 0) => {
      const iframes = [
        ...document.querySelectorAll('iframe[src*="player.vimeo.com"]'),
      ];
      // O conteúdo tem vídeo mas o iframe ainda não está na página: tenta de novo (nunca liberta sem ver)
      if (iframes.length === 0) {
        if (tries < 40) retryTimer = setTimeout(() => attachPlayers(tries + 1), 250);
        return;
      }
      let endedCount = 0;
      players = iframes.map((iframe) => {
        const player = new Player(iframe);
        let watched = 0; // até onde o aluno já viu, sem saltos
        let ended = false;

        player.on("timeupdate", (data) => {
          if (data.seconds > watched && data.seconds < watched + 1.5)
            watched = data.seconds;
        });
        player.on("seeked", (data) => {
          if (data.seconds > watched + 1.5) {
            watched = 0;
            player.setCurrentTime(0);
          }
        });
        player.on("ended", () => {
          if (ended) return;
          ended = true;
          endedCount++;
          if (endedCount === iframes.length) {
            setAllowNext(true);
            setIsVideoCompleted(true);
          }
        });
        return player;
      });
      playerRef.current = players[0];
    };
    attachPlayers();

    // Ao mudar de item, remove os listeners dos vídeos anteriores
    return () => {
      clearTimeout(retryTimer);
      players.forEach((player) => {
        player.off("timeupdate");
        player.off("seeked");
        player.off("ended");
      });
    };
  }, [selectedCourseItem]);

  const parsedContent = useMemo(() => {
    const resp = selectedCourseItem.content
      ? JSON.parse(selectedCourseItem.content)
      : {};
    setSeo({
      title: resp?.root?.props?.title || null,
      description: resp?.root?.props?.description || null,
      heroImage: resp?.root?.props?.heroImage?.url || null,
    });
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
        <meta
          name="description"
          content={seo.description ?? selectedCourseItem.title}
        />
        <meta
          property="og:title"
          content={seo.title ?? selectedCourseItem.title}
        />
        <meta
          property="og:description"
          content={seo.description ?? selectedCourseItem.title}
        />
        {seo.heroImage?.url && (
          <meta property="og:image" content={seo.heroImage?.url} />
        )}
      </Helmet>
      <div className="flex justify-between flex-col h-full">
        <div className="overflow-y-auto">
          {isTopicLocked ? (
            <LockedMessage
              title={t("This topic is locked")}
              description={t(
                "You'll need to complete the previous topic first",
              )}
            />
          ) : (
            <PuckRender config={configRender} data={parsedContent} />
          )}
        </div>
      </div>
    </div>
  );
};
export default Topic;
