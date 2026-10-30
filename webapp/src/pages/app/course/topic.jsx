import { useTranslation } from "react-i18next";
import { config as configRender } from "../../../components/admin/editor/config";
import { useContext, useEffect, useMemo, useRef, useState } from "react";

import Player from "@vimeo/player";
import LockedMessage from "../../../components/app/course/lockedMessage";
import PuckRender from "../../../components/app/puckRender";
import { Helmet } from "react-helmet";
import { Context } from "../../../utils/context";
import { hasFullAccess } from "../../../utils/roles";
import { lockedDescription, previousRequiredItem } from "../../../utils/courseStatus";

// Segundos entre gravações da posição do vídeo durante a reprodução
const VIDEO_SAVE_INTERVAL = 30000;

// Retoma o vídeo onde o aluno ficou. Resolve true se retomou; false se não há posição guardada, se falhou, ou se ficou nos últimos 3 s do
// vídeo (nesse caso recomeça do início em vez de abrir o vídeo já acabado)
function resumeVideo(player, saved) {
  if (!(saved > 0)) return Promise.resolve(false);
  return player
    .ready()
    .then(() => player.getDuration())
    .then((duration) => (saved < duration - 3 ? player.setCurrentTime(saved).then(() => true) : false))
    .catch(() => false);
}

// Posição guardada de um vídeo do tópico
const savedPosition = (videoProgress, topicId, videoId) => videoProgress?.find((v) => v.id_course_topic === topicId && v.video_id === videoId)?.time_watched || 0;
const vimeoIdOf = (iframe) => iframe.src.match(/player\.vimeo\.com\/video\/(\d+)/)?.[1] || "";

const Topic = ({
  course,
  selectedCourseItem,
  progress,
  setAllowNext,
  allItems,
  forceLocked,
  // Navegação livre: o que falta concluir ("topic", "test" ou "steps"), para o texto do bloqueio
  lockedBy,
  // Retoma dos vídeos: posições guardadas do aluno e a função que grava a posição atual de um vídeo
  videoProgress,
  saveVideoProgress,
}) => {
  const [isTopicLocked, setIsTopicLocked] = useState(false);
  const { t } = useTranslation();
  const { user } = useContext(Context);
  // Admin (id_role = 1) sem restrições; aluno (id_role = 2) com navegação linear e vídeos obrigatórios
  const isAdmin = hasFullAccess(user);

  const playerRef = useRef(null);
  // Lidas por refs: o efeito dos vídeos só recomeça quando muda o tópico, nunca a cada render desta página
  const videoProgressRef = useRef(videoProgress);
  videoProgressRef.current = videoProgress;
  const saveVideoProgressRef = useRef(saveVideoProgress);
  saveVideoProgressRef.current = saveVideoProgress;

  useEffect(() => {
    setAllowNext(false);
    setIsTopicLocked(false);

    if (selectedCourseItem.type !== "topic") return;

    const isCompleted = progress.some(
      (p) =>
        p.activity_type === "topic" &&
        p.id_course_topic === selectedCourseItem.id &&
        p.is_completed === 1 &&
        p.is_deleted !== 1,
    );

    // Admin: navegação livre, não precisa de ver os vídeos (e a sua posição não se guarda)
    if (isAdmin) {
      setAllowNext(true);
      return;
    }

    // Tópico já concluído: pode avançar e rever à vontade (sem a regra de ver até ao fim), mas os vídeos retomam onde o aluno ficou
    if (isCompleted) {
      setAllowNext(true);
      if (!(selectedCourseItem.content || "").includes("player.vimeo.com")) return;
      const reviewSavers = [];
      let reviewPlayers = [];
      let reviewRetry = null;
      const attachReview = (tries = 0) => {
        const iframes = [...document.querySelectorAll('iframe[src*="player.vimeo.com"]')];
        if (iframes.length === 0) {
          if (tries < 40) reviewRetry = setTimeout(() => attachReview(tries + 1), 250);
          return;
        }
        reviewPlayers = iframes.map((iframe) => {
          const player = new Player(iframe);
          const videoId = vimeoIdOf(iframe);
          const topicId = selectedCourseItem.id;
          const saved = savedPosition(videoProgressRef.current, topicId, videoId);
          let position = saved; // onde o aluno está agora (a rever pode recuar: o servidor substitui a posição guardada)
          let lastSaved = saved;
          let lastSaveAt = 0;
          const save = () => {
            const seconds = Math.floor(position);
            if (seconds === lastSaved) return;
            lastSaved = seconds;
            lastSaveAt = Date.now();
            saveVideoProgressRef.current?.(topicId, videoId, seconds, true);
          };
          resumeVideo(player, saved).then((resumed) => {
            if (!resumed && saved > 0) position = lastSaved = 0;
          });
          player.on("timeupdate", (data) => {
            position = data.seconds;
            if (!lastSaveAt) lastSaveAt = Date.now();
            else if (Date.now() - lastSaveAt >= VIDEO_SAVE_INTERVAL) save();
          });
          player.on("pause", save);
          // Chegou ao fim: da próxima vez começa do início
          player.on("ended", () => {
            position = 0;
            save();
          });
          reviewSavers.push(save);
          return player;
        });
      };
      attachReview();
      const saveReview = () => document.visibilityState === "hidden" && reviewSavers.forEach((save) => save());
      document.addEventListener("visibilitychange", saveReview);
      return () => {
        document.removeEventListener("visibilitychange", saveReview);
        reviewSavers.forEach((save) => save());
        clearTimeout(reviewRetry);
        reviewPlayers.forEach((player) => {
          player.off("timeupdate");
          player.off("pause");
          player.off("ended");
        });
      };
    }

    // Navegação livre: é o item a seguir a um ainda por concluir → só o ecrã de bloqueado (sem o conteúdo)
    if (forceLocked) {
      setIsTopicLocked(lockedBy || "topic");
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
      // O item anterior que tem de estar concluído (um teste expirado por fazer não conta: já não se pode fazer)
      const previousItem = findIndex > 0 ? previousRequiredItem(allItems, findIndex, progress, user?.country) : null;
      if (previousItem) {
        const previousCompleted = progress.some(
          (p) =>
            p.is_completed === 1 &&
            p.is_deleted !== 1 &&
            p.activity_type === previousItem.type &&
            p[`id_course_${previousItem.type}`] === previousItem.id,
        );
        if (!previousCompleted) {
          // Guarda o tipo do item anterior, para o texto do bloqueio (tópico ou teste anterior)
          setIsTopicLocked(previousItem.type);
          return;
        }
      }
    }

    // Requisitos para avançar (navegação free ou linear): ver todos os vídeos até ao fim e todos os slides dos carrosséis
    const content = selectedCourseItem.content || "";
    const hasVideo = content.includes("player.vimeo.com");
    const hasCarousel = content.includes('"ImageCarousel"');
    if (!hasVideo && !hasCarousel) {
      setAllowNext(true);
      return;
    }
    let videosDone = !hasVideo;
    // Carrosséis na página com todos os slides vistos (um carrossel sem imagens não aparece e não conta)
    const carouselsDone = () => [...document.querySelectorAll(".bial-carousel")].every((c) => c.dataset.seenAll === "true");
    const checkDone = () => {
      if (videosDone && carouselsDone()) setAllowNext(true);
    };
    window.addEventListener("bial-carousel-progress", checkDone);
    // Primeira verificação depois de os blocos aparecerem na página (o carrossel só com 1 slide fica logo visto)
    const firstCheck = setTimeout(checkDone, 1500);
    if (!hasVideo) {
      return () => {
        clearTimeout(firstCheck);
        window.removeEventListener("bial-carousel-progress", checkDone);
      };
    }

    // Vídeos (Vimeo): o aluno tem de ver todos até ao fim para avançar; se tentar avançar o tempo do
    // vídeo para a frente, o vídeo volta sempre ao início
    let players = [];
    // Uma função de gravar por vídeo (a posição é gravada também ao esconder a página e ao mudar de item)
    const savers = [];
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
        // O ID do Vimeo identifica o vídeo na posição guardada (estável mesmo que o conteúdo mude de ordem)
        const videoId = vimeoIdOf(iframe);
        const topicId = selectedCourseItem.id;
        const saved = savedPosition(videoProgressRef.current, topicId, videoId);
        // Retoma onde ficou: a posição guardada já conta como vista (senão o salto para lá seria tratado como avançar o vídeo)
        let watched = saved; // até onde o aluno já viu, sem saltos
        let lastSaved = saved;
        let lastSaveAt = 0; // quando começou a contar os 30 s: na primeira reprodução, não ao ligar o player
        let ended = false;

        // Grava até onde o aluno viu (nunca menos do que já está guardado)
        const save = () => {
          const seconds = Math.floor(watched);
          if (seconds <= lastSaved) return;
          lastSaved = seconds;
          lastSaveAt = Date.now();
          saveVideoProgressRef.current?.(topicId, videoId, seconds);
        };
        // Sem retomar (ficou no fim, ou falhou), o vídeo começa do início e nada conta como visto
        resumeVideo(player, saved).then((resumed) => {
          if (!resumed && saved > 0) watched = 0;
        });

        player.on("timeupdate", (data) => {
          if (data.seconds > watched && data.seconds < watched + 1.5)
            watched = data.seconds;
          if (!lastSaveAt) lastSaveAt = Date.now();
          else if (Date.now() - lastSaveAt >= VIDEO_SAVE_INTERVAL) save();
        });
        player.on("pause", save);
        player.on("seeked", (data) => {
          if (data.seconds > watched + 1.5) {
            watched = 0;
            player.setCurrentTime(0);
          }
        });
        player.on("ended", () => {
          save();
          if (ended) return;
          ended = true;
          endedCount++;
          if (endedCount === iframes.length) {
            videosDone = true;
            checkDone();
          }
        });
        savers.push(save);
        return player;
      });
      playerRef.current = players[0];
    };
    attachPlayers();

    // Ao esconder a página (mudar de separador, fechar) grava já a posição, sem esperar pelos 30 s
    const saveAll = () => document.visibilityState === "hidden" && savers.forEach((save) => save());
    document.addEventListener("visibilitychange", saveAll);

    // Ao mudar de item, grava a posição e remove os listeners dos vídeos anteriores
    return () => {
      document.removeEventListener("visibilitychange", saveAll);
      savers.forEach((save) => save());
      clearTimeout(retryTimer);
      clearTimeout(firstCheck);
      window.removeEventListener("bial-carousel-progress", checkDone);
      players.forEach((player) => {
        player.off("timeupdate");
        player.off("pause");
        player.off("seeked");
        player.off("ended");
      });
    };
  }, [selectedCourseItem, forceLocked, lockedBy]);

  const parsedContent = useMemo(() => (selectedCourseItem.content ? JSON.parse(selectedCourseItem.content) : {}), [selectedCourseItem.content]);

  // Título, descrição e imagem da página (definições da raiz do conteúdo): derivam do conteúdo, sem estado próprio
  const seo = useMemo(
    () => ({
      title: parsedContent?.root?.props?.title || null,
      description: parsedContent?.root?.props?.description || null,
      heroImage: parsedContent?.root?.props?.heroImage?.url || null,
    }),
    [parsedContent],
  );

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
              description={lockedDescription(t, isTopicLocked)}
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
