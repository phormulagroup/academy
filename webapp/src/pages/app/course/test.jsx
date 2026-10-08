import { useTranslation } from "react-i18next";
import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Checkbox, Form, Progress } from "antd";
import {
  AiFillCheckCircle,
  AiFillCloseCircle,
  AiOutlineCheck,
  AiOutlineClose,
} from "react-icons/ai";
import {
  RxChevronLeft,
  RxChevronRight,
  RxFileText,
  RxReload,
} from "react-icons/rx";
import { MdTimerOff } from "react-icons/md";
import { PiCalendarXDuotone, PiHourglassMediumDuotone } from "react-icons/pi";
import axios from "axios";
import endpoints from "../../../utils/endpoints";
import { Context } from "../../../utils/context";
import { isTestFailed, parseSettings, testDateState } from "../../../utils/courseStatus";
import LockedMessage from "../../../components/app/course/lockedMessage";
import TestCountdown from "../../../components/app/course/testCountdown";
import dayjs from "dayjs";
import { Helmet } from "react-helmet";
import { hasFullAccess } from "../../../utils/roles";

// Avalia a resposta a uma pergunta (mesma regra do envio normal). Sem resposta conta como errada.
// Devolve null quando a pergunta não tem resposta correta definida (não conta para a nota).
function evaluateQuestion(question, answer) {
  const correct = (question?.answer || []).filter((a) => a.is_correct);
  if (correct.length === 0) return null;
  const answered = Array.isArray(answer) ? answer.length > 0 : !!answer;
  let is_correct = false;
  if (answered) {
    is_correct =
      typeof answer === "string"
        ? answer === correct[0].title
        : correct.every((c) => answer.includes(c.title));
  }
  return {
    is_correct,
    ...question,
    myAnswer: answered ? answer : correct.length > 1 ? [] : null,
    ...(answered ? {} : { unanswered: true }),
  };
}

// Aviso de datas do teste para o admin (expirado / ainda não disponível para os alunos)
function TestDateNotice({ type, date, t }) {
  const expired = type === "expired";
  const Icon = expired ? PiCalendarXDuotone : PiHourglassMediumDuotone;
  return (
    <div
      className={`flex items-center gap-3 rounded-[5px] mt-4 p-3 sm:p-4 text-white ${expired ? "bg-[#8B9CC3]" : "bg-[#00B9D6]"}`}>
      <Icon className="shrink-0 w-6 h-6 sm:w-8 sm:h-8" />
      <div className="min-w-0">
        <p className="font-ryker font-bold leading-tight text-[14px] sm:text-[16px] lg:text-[18px]">
          {expired
            ? t("This test expired on")
            : t("This test will be available to students on")}{" "}
          {dayjs(date).format("DD/MM/YYYY HH:mm")}
        </p>
        <p className="text-[12px] sm:text-[13px] lg:text-[14px] mt-0.5">
          {expired
            ? t("Students no longer see this test in the course")
            : t("Students see a countdown until this date")}
        </p>
      </div>
    </div>
  );
}

const Test = ({
  course,
  selectedCourseItem,
  progress,
  setAllowNext,
  allItems,
  setMetaData,
  modules,
  updateProgress,
  next,
  onInProgressChange,
  // Elemento fixo no fundo do eLearning onde fica a navegação entre perguntas durante o teste
  footerSlot,
}) => {
  const { user, toastApi, windowDimension } = useContext(Context);
  // Admin (id_role = 1) sem restrições de datas; alunos veem a contagem decrescente até à data de início
  const isAdmin = hasFullAccess(user);
  // Ecrãs estreitos: labels curtas na barra de navegação do teste
  const shortNavLabels = windowDimension?.width < 480;
  const [data, setData] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [calculate, setCalculate] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [begin, setBegin] = useState(false);
  const [timerEnded, setTimerEnded] = useState(false);
  const [review, setReview] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [timePassed, setTimePassed] = useState(0);
  const [timePercentage, setTimePercentage] = useState(100);
  const [result, setResult] = useState([]);
  const [finished, setFinished] = useState(false);

  // Informa o eLearning se o teste está a decorrer (iniciado e não terminado), para bloquear a navegação
  useEffect(() => {
    onInProgressChange?.(begin && !finished);
  }, [begin, finished]);

  const [isTopicLocked, setIsTopicLocked] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  const { t } = useTranslation();
  const [form] = Form.useForm();
  const timerRef = useRef(null);

  // Ao sair do teste: liberta a navegação e pára o temporizador
  useEffect(
    () => () => {
      onInProgressChange?.(false);
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  // Tempo limite esgotado durante o teste: avalia as respostas dadas até ao momento
  useEffect(() => {
    if (timerEnded && begin && !finished && !isCalculating) finishByTimeUp();
  }, [timerEnded]);

  function parseTestMetadata(metaData) {
    if (!metaData) return null;
    try {
      return JSON.parse(metaData);
    } catch (e) {
      console.error("Error parsing test result:", e);
      return null;
    }
  }

  useEffect(() => {
    if (selectedCourseItem.type !== "test") return;
    setAllowNext(false);
    setMetaData(null);

    // Novo teste selecionado (ex.: dois testes seguidos): recomeça o estado do teste anterior
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setBegin(false);
    setFinished(false);
    setResult([]);
    setReview(false);
    setTimerEnded(false);
    setCurrentQuestion(0);
    setTimePercentage(100);
    setIsTopicLocked(false);
    form.resetFields();

    prepareData();

    // Verifica se o teste foi concluído ou se houve tentativas falhadas
    const completedTest = progress.filter(
      (p) =>
        p.activity_type === "test" &&
        p.is_completed === 1 &&
        p.is_deleted !== 1 &&
        p.id_course_test === selectedCourseItem.id,
    );
    const failedAttempts = progress.filter(
      (p) =>
        p.activity_type === "test" &&
        p.is_completed === 0 &&
        p.is_deleted !== 1 &&
        p.id_course_test === selectedCourseItem.id,
    );

    if (completedTest.length > 0) {
      // Teste é aprovado - mostra o layout aprovado sem opção de reinício
      setAllowNext(true);
      setIsTopicLocked(false);
      setFinished(true);
      setBegin(true);

      // Restaura o resultado do teste aprovado a partir dos metadados do progresso
      const approvedResult = parseTestMetadata(completedTest[0].meta_data);
      if (approvedResult) setResult(approvedResult);
    } else if (failedAttempts.length > 0) {
      // Teste tem tentativas falhadas - mostra o layout falhado (com ou sem botão de reinício com base nas tentativas)
      setAllowNext(false);
      setIsTopicLocked(false);
      setFinished(true);
      setBegin(true);

      // Restaura o resultado da tentativa falhada mais recente
      const latestFailedAttempt = failedAttempts[failedAttempts.length - 1];
      const failedResult = parseTestMetadata(latestFailedAttempt.meta_data);
      if (failedResult) setResult(failedResult);
    }

    if (course.settings && course.settings.progression_type === "linear") {
      let findIndex = allItems.findIndex(
        (i) =>
          i.id === selectedCourseItem.id && i.type === selectedCourseItem.type,
      );
      if (findIndex > 0) {
        let previousItem = allItems[findIndex - 1];
        let previousCompleted = progress.filter(
          (p) =>
            p.is_completed === 1 &&
            p.is_deleted !== 1 &&
            ((p.activity_type === "topic" &&
              p.id_course_topic === previousItem.id) ||
              (p.activity_type === "test" &&
                p.id_course_test === previousItem.id)),
        ).length;

        if (previousCompleted > 0) {
          setIsTopicLocked(false);
        } else {
          setIsTopicLocked(true);
        }
      }
    }
  }, [selectedCourseItem]);

  function prepareData() {
    let aux = Object.assign({}, selectedCourseItem);
    aux.settings = aux.settings ? JSON.parse(aux.settings) : {};

    aux.question = aux.question
      ? aux.settings?.randomize_questions
        ? shuffleArray(JSON.parse(aux.question))
        : JSON.parse(aux.question)
      : [];
    for (let i = 0; i < aux.question.length; i++) {
      if (aux.question[i].answer && aux.question[i].answer.length > 0) {
        aux.question[i].answer = aux.settings?.randomize_answers
          ? shuffleArray(aux.question[i].answer)
          : aux.question[i].answer;
      }
    }

    if (aux.settings?.time) {
      let timer = aux.settings?.time * 60,
        minutes,
        seconds;
      minutes = parseInt(timer / 60, 10);
      seconds = parseInt(timer % 60, 10);

      minutes = minutes < 10 ? "0" + minutes : minutes;
      seconds = seconds < 10 ? "0" + seconds : seconds;
      setCountdown(minutes + ":" + seconds);
    }

    // Antes da data de início os alunos veem a contagem decrescente (o admin não tem restrições)
    setIsAvailable(isAdmin || testDateState(aux) !== "upcoming");
    setData(aux);
  }

  function startTimer(duration) {
    let timer = duration ?? 60 * 45;

    // limpa interval antigo antes de criar outro
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      let minutes = parseInt(timer / 60, 10);
      let seconds = parseInt(timer % 60, 10);

      minutes = minutes < 10 ? "0" + minutes : minutes;
      seconds = seconds < 10 ? "0" + seconds : seconds;

      setCountdown(minutes + ":" + seconds);
      setTimePercentage((timer * 100) / (duration ?? 60 * 45));
      setTimePassed(duration - timer);

      if (--timer < 0) {
        setTimerEnded(true);
        clearInterval(timerRef.current);
      }
    }, 1000);
  }

  // Tempo limite esgotado: avalia as respostas dadas durante o tempo (sem resposta = errada) e regista a
  // tentativa como num envio normal (aprovada se atingir a percentagem mínima, senão falhada)
  function finishByTimeUp() {
    const values = form.getFieldsValue(true) || {};
    const items = (data.question || [])
      .map((q) => evaluateQuestion(q, values[q.title]?.answer))
      .filter(Boolean);
    const auxResult = {
      items,
      time: Number(data.settings?.time) * 60,
      timeUp: true,
    };

    setResult(auxResult);
    setMetaData(items);
    setReview(false);
    setFinished(true);

    const passingScore = data.settings?.passing_score ?? 80;
    const percentage =
      items.length > 0
        ? (items.filter((r) => r.is_correct).length * 100) / items.length
        : 0;
    if (percentage >= passingScore) {
      setAllowNext(true);
      next(false, auxResult);
    } else {
      createActivity(auxResult);
    }
  }

  function startTest() {
    setTimePassed(0);
    setBegin(true);
    if (data.settings?.time) startTimer(data.settings?.time * 60);
  }

  function restartTest() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setResult([]);
    setMetaData(null);
    setTimePercentage(100);
    setReview(false);
    setCurrentQuestion(0);
    setCalculate({});
    setTimerEnded(false);
    setFinished(false);
    setBegin(true);
    prepareData();
    form.resetFields();
    if (data.settings?.time) startTimer(data.settings?.time * 60);
  }

  function submit(values) {
    const isValid = Object.keys(values).map(
      (key) =>
        values[key]?.answer &&
        (!Array.isArray(values[key].answer) || values[key].answer.length > 0),
    );

    if (isValid.filter((item) => !item).length > 0) {
      toastApi.open({
        type: "error",
        content: t(
          "You will need to answer ALL questions! Please check if you miss any question.",
        ),
      });
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setIsCalculating(true);
      const questions = Object.keys(values);

      let index = 0;
      let auxResult = [];

      const interval = setInterval(() => {
        if (index < questions.length) {
          if (values[questions[index]]) {
            const auxQuestion = data.question.find(
              (q) => q.title === questions[index],
            );
            const evaluated = evaluateQuestion(
              auxQuestion,
              values[questions[index]].answer,
            );
            if (evaluated) auxResult.push(evaluated);
          }

          setCalculate({
            percentage: ((index + 1) * 100) / questions.length,
            step: `${index + 1} / ${questions.length}`,
          });
        }

        setResult({ items: auxResult, time: timePassed });
        setMetaData(auxResult);
        setFinished(true);

        index++;

        if (index === questions.length + 1) {
          clearInterval(interval);
          setIsCalculating(false);

          let passingScore = data.settings?.passing_score ?? 80;

          if (
            (auxResult.filter((r) => r.is_correct).length * 100) /
              auxResult.length >=
            passingScore
          ) {
            setAllowNext(true);
            next(false, { items: auxResult, time: timePassed });
          } else {
            createActivity({ items: auxResult, time: timePassed });
          }
        }
      }, 100);
    }
  }

  function shuffleArray(array) {
    const arr = [...array]; // copia para não alterar o original

    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); // índice aleatório
      [arr[i], arr[j]] = [arr[j], arr[i]]; // swap
    }

    return arr;
  }

  function createActivity(auxMetaData) {
    const moduleSelectedCourseItem = modules.filter(
      (m) => m.id === selectedCourseItem.id_course_module,
    )[0];
    const auxData = [
      {
        id_course: course.id,
        id_user: user.id,
        activity_type: "test",
        id_course_test: selectedCourseItem.id,
        id_course_module: moduleSelectedCourseItem.id,
        is_completed: 0,
        meta_data: auxMetaData ? JSON.stringify(auxMetaData) : null,
        created_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        modified_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      },
    ];

    axios
      .post(endpoints.course.updateProgress, {
        data: auxData,
      })
      .then(() => {
        updateProgress(auxData[0]);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  return (
    <div>
      <Helmet>
        <meta charSet="utf-8" />
        <title>{selectedCourseItem.title}</title>
        <meta name="description" content={selectedCourseItem.title} />
        <meta property="og:title" content={selectedCourseItem.title} />
        <meta property="og:description" content={selectedCourseItem.title} />
      </Helmet>
      <div className="flex justify-between flex-col h-full">
        <div className="overflow-y-auto">
          {/* Admin: aviso das datas do teste (expirado / ainda não disponível para os alunos) */}
          {isAdmin &&
            (() => {
              const dateState = testDateState(selectedCourseItem);
              const { start_date, end_date } = parseSettings(
                selectedCourseItem.settings,
              );
              if (dateState === "expired")
                return <TestDateNotice type="expired" date={end_date} t={t} />;
              if (dateState === "upcoming")
                return (
                  <TestDateNotice type="upcoming" date={start_date} t={t} />
                );
              return null;
            })()}
          {isTopicLocked ? (
            <LockedMessage
              title={t("This test is locked")}
              description={t(
                "You'll need to complete the previous topic first",
              )}
            />
          ) : (
            Object.keys(data).length > 0 && (
              <div>
                {!isAvailable ? (
                  <TestCountdown
                    startDate={data.settings?.start_date}
                    onReachZero={() => setIsAvailable(true)}
                  />
                ) : !begin ? (
                  <div className="flex flex-col justify-center items-center bg-white border-2 border-dashed border-[#00B9D6] p-4 sm:p-6 rounded-[5px] mt-4">
                    <p className="font-ryker font-bold text-[16px]">
                      <b>{t("Approval percentage")}:</b>{" "}
                      {data.settings.passing_score}%
                    </p>
                    {Number(data.settings.time) > 0 && (
                      <p className="text-[16px]">
                        <b>{t("Time")}:</b> {data.settings.time} {t("minutes")}
                      </p>
                    )}
                    {Number(data.settings.retries_allowed) > 0 && (
                      <p className="text-[16px]">
                        <b>{t("Retries allowed")}:</b>{" "}
                        {data.settings.retries_allowed}
                      </p>
                    )}
                    <p className="text-center text-[14px] text-[#999] mt-2">
                      {!data.settings.time && !data.settings.retries_allowed
                        ? t(
                            "This test doesn't have limited time or retries allowed",
                          )
                        : !data.settings.time
                          ? t("This test doesn't have limited time")
                          : !data.settings.retries_allowed
                            ? t("This test doesn't have retries allowed")
                            : null}
                    </p>
                    <Button
                      onClick={startTest}
                      className="mt-4 main-cta-button"
                      type="primary"
                      size="large">
                      {t("Start test")}
                    </Button>
                  </div>
                ) : isCalculating ? (
                  <div className="flex flex-col justify-center items-center p-6 bg-white mt-4">
                    <p className="font-ryker mb-4 text-[24px] font-bold">
                      {t("Calculating...")}
                    </p>
                    <Progress percent={calculate.percentage} showInfo={false} />
                    {calculate.step ? (
                      <p className="font-bold mt-4 text-center">
                        {calculate.step}
                      </p>
                    ) : (
                      <p className="font-bold mt-4 text-center">
                        0 / {data.question?.length}
                      </p>
                    )}
                  </div>
                ) : finished ? (
                  <div className="flex flex-col mt-4">
                    {(() => {
                      const correctAnswers =
                        result.items?.filter((r) => r.is_correct).length || 0;
                      const totalQuestions = result.items?.length || 1;
                      const percentage =
                        (correctAnswers * 100) / totalQuestions;
                      const passingScore = data.settings?.passing_score ?? 80;
                      const isApproved = percentage >= passingScore;
                      // Mesma regra dos relatórios (utils/courseStatus): só há limite de tentativas quando
                      // retries_allowed está definido; sem limite pode repetir sempre
                      const canStillRetry =
                        !isApproved &&
                        !isTestFailed(progress, selectedCourseItem);
                      const statusLabel = isApproved
                        ? t("Approved")
                        : canStillRetry
                          ? t("Failed test")
                          : t("Repproved Test");
                      const answeredCount =
                        result.items?.filter((r) => !r.unanswered).length || 0;

                      return (
                        <>
                          {/* LAYOUT UNIFICADO DE RESULTADOS PARA APROVADO, REPROVADO E TEMPO ESGOTADO */}
                          <div className="flex flex-col justify-center items-center p-4 sm:p-6 bg-white mt-4 rounded-[5px]">
                            {result.timeUp ? (
                              // Tempo limite esgotado: resultado com as respostas dadas durante o tempo
                              <>
                                <div className="w-14 h-14 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-full bg-[#FFF4F0] border-2 border-dashed border-[#FF7D5A] flex items-center justify-center">
                                  <MdTimerOff className="text-[28px] sm:text-[36px] lg:text-[42px] text-[#FF7D5A]" />
                                </div>
                                <p className="font-ryker font-bold text-[#163986] leading-tight mt-3 sm:mt-4 text-[18px] sm:text-[21px] lg:text-[24px]">
                                  {t("Time is up")}
                                </p>
                                <p className="text-center text-[#163986] text-[12px] sm:text-[14px] mt-2 max-w-125">
                                  {t(
                                    "The time limit for this test ran out. The answers you gave during the time were evaluated and unanswered questions count as wrong.",
                                  )}
                                </p>
                                <span
                                  className={`mt-3 sm:mt-4 px-3 py-1 rounded-[5px] text-white font-semibold text-[12px] sm:text-[13px] lg:text-[14px] ${isApproved ? "bg-[#2F8351]" : "bg-[#DB0709]"}`}>
                                  {statusLabel}
                                </span>
                                <p className="text-[14px] sm:text-[16px] mt-4">
                                  <b>{t("Answered questions")}:</b>{" "}
                                  {answeredCount} / {result.items?.length || 0}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="font-ryker mb-4 font-bold text-[24px]">
                                  {t("Result")}
                                </p>
                                {isApproved ? (
                                  <AiFillCheckCircle className="text-[80px] text-[#2F8351]" />
                                ) : (
                                  <AiFillCloseCircle className="text-[80px] text-[#DB0709]" />
                                )}
                                <p className="font-ryker mt-4 mb-4 text-[24px] font-bold">
                                  {statusLabel}
                                </p>
                              </>
                            )}
                            <p
                              className={`text-[14px] sm:text-[16px] ${result.timeUp ? "mt-1" : "mt-4"}`}>
                              <b>{t("Your tries")}:</b>{" "}
                              {
                                progress.filter(
                                  (p) =>
                                    p.activity_type === "test" &&
                                    p.is_deleted !== 1 &&
                                    p.id_course === course.id &&
                                    p.id_course_test === selectedCourseItem.id,
                                ).length
                              }
                              {Number(data.settings?.retries_allowed) > 0 ? (
                                <> / {data.settings?.retries_allowed}</>
                              ) : null}
                            </p>
                            <p className="mt-4">{t("Your percentage")}:</p>
                            <p className="mb-4 text-[24px] font-bold">
                              {percentage.toFixed(2)}%
                            </p>
                            {!isApproved && (
                              <p className="text-center text-[14px] text-[#666]">
                                {t("You needed")} {passingScore}% {t("to pass")}
                              </p>
                            )}
                          </div>

                          {/* BANNER DE AVISO - APENAS PARA TESTES REPROVADOS SEM TENTATIVAS RESTANTES */}
                          {!isApproved && !canStillRetry && (
                            <div className="p-3 sm:p-4 flex items-center bg-[#FF7D5A] text-white mt-4 rounded-[5px]">
                              <div>
                                <p className="text-[16px] font-bold">
                                  {t("You did not pass this test")}
                                </p>
                                <p className="text-[14px]">
                                  {t("You have reached your attempt limit")}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* AÇÕES */}
                          <div
                            className={`flex mb-4 mt-4 w-full gap-2 ${isApproved ? "justify-center" : ""}`}>
                            <Button
                              size="large"
                              className="blue flex-1"
                              onClick={() => setReview(!review)}
                              icon={<RxFileText />}>
                              {review
                                ? t("Hide questions")
                                : t("Review questions")}
                            </Button>
                            {!isApproved && canStillRetry && (
                              <Button
                                size="large"
                                className="flex-1 main-secondary-cta-button"
                                onClick={() => restartTest()}
                                icon={<RxReload />}>
                                {t("Restart test")}
                              </Button>
                            )}
                          </div>
                        </>
                      );
                    })()}

                    {/* LISTA DE QUESTÕES */}
                    {result.items?.map((q, i) => (
                      <div
                        className={`p-4 sm:p-6 flex flex-col bg-white rounded-[5px] border-2 border-dashed border-[#00B9D6] ${review ? "flex mt-4 w-full" : "hidden"}`}>
                        <div className="flex justify-between gap-2">
                          <p className="mb-4">
                            <b>{i + 1}</b>. {q.title}
                          </p>
                          {q.unanswered && (
                            <span className="shrink-0 self-start px-2 py-0.5 rounded-[5px] bg-[#DB0709] text-white text-[11px] sm:text-[12px]">
                              {t("Not answered")}
                            </span>
                          )}
                        </div>
                        <div>
                          {q.answer.filter((c) => c.is_correct).length > 1 ? (
                            <div>
                              {q.answer.map((a) => (
                                <div
                                  className={`review-test-question multiple ${q.myAnswer.includes(a.title) ? (a.is_correct ? "correct" : "incorrect") : data.settings.show_correct_answers ? (q.myAnswer.includes(a.title) && !a.is_correct ? "incorrect" : a.is_correct ? "correct" : "") : ""}`}>
                                  <div className="flex">
                                    <div
                                      className={`circle flex justify-center items-center`}>
                                      {q.myAnswer.includes(a.title) && (
                                        <div className="w-full h-full bg-[#00B9D6] rounded-full flex justify-center items-center">
                                          <AiOutlineCheck className="text-white text-[12px]" />
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <p>{a.title}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center">
                                    {q.myAnswer.includes(a.title) &&
                                      a.is_correct && (
                                        <AiOutlineCheck className="mr-2 text-[#2F8351]" />
                                      )}
                                    {q.myAnswer.includes(a.title) &&
                                      !a.is_correct && (
                                        <AiOutlineClose className="mr-2 text-[#DB0709]" />
                                      )}
                                    {q.myAnswer.includes(a.title) &&
                                      !a.is_correct && (
                                        <p className={"text-[#DB0709]"}>
                                          {t("Incorrect answer")}
                                        </p>
                                      )}
                                    {((q.myAnswer.includes(a.title) &&
                                      a.is_correct) ||
                                      data.settings.show_correct_answers) && (
                                      <p className={"text-[#2F8351]"}>
                                        {a.is_correct && t("Correct answer")}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div>
                              {q.answer.map((a) => (
                                <div
                                  className={`review-test-question ${a.title === q.myAnswer ? (q.is_correct ? "correct" : "incorrect") : data.settings.show_correct_answers ? (a.is_correct ? "correct" : !a.is_correct ? "incorrect" : "") : ""}`}>
                                  <div className="flex">
                                    <div
                                      className={`circle flex justify-center items-center`}>
                                      {a.title === q.myAnswer && (
                                        <div className="w-3.5 h-3.5 bg-[#00B9D6] rounded-full"></div>
                                      )}
                                    </div>
                                    <div>
                                      <p>{a.title}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center">
                                    {a.title === q.myAnswer && a.is_correct && (
                                      <AiOutlineCheck className="mr-2 text-[#2F8351]" />
                                    )}
                                    {a.title === q.myAnswer &&
                                      !a.is_correct && (
                                        <AiOutlineClose className="mr-2 text-[#DB0709]" />
                                      )}
                                    {a.title === q.myAnswer &&
                                      !a.is_correct && (
                                        <p className={"text-[#DB0709]"}>
                                          {t("Incorrect answer")}
                                        </p>
                                      )}
                                    {((a.title === q.myAnswer &&
                                      a.is_correct) ||
                                      data.settings.show_correct_answers) && (
                                      <p className={"text-[#2F8351]"}>
                                        {a.is_correct && t("Correct answer")}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Form form={form} onFinish={submit}>
                    {/* Tempo limite: só aparece quando o teste tem limite de tempo */}
                    {Number(data.settings?.time) > 0 && (
                      <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#C5CEE1] rounded-[5px] mt-3 sm:mt-4">
                        <div className="flex justify-between items-center gap-2">
                          <p className="text-[#163986] font-semibold text-[12px] sm:text-[13px] lg:text-[14px]">
                            {t("Limit time")}
                          </p>
                          <p className="text-[#163986] font-bold tabular-nums text-[13px] sm:text-[15px] lg:text-[16px]">
                            {countdown}
                          </p>
                        </div>
                        <Progress
                          percent={timePercentage}
                          showInfo={false}
                          size="small"
                          railColor={"#FFF"}
                          strokeColor={"#00B9D6"}
                          className="mb-0!"
                        />
                      </div>
                    )}

                    <div>
                      <p className="mb-4 mt-4">
                        {t("Question")} <b>{currentQuestion + 1}</b> {t("of")}{" "}
                        <b>{data.question.length}</b>
                      </p>
                    </div>
                    <div>
                      {data.question.map((q, i) => (
                        <div
                          className={`${i === currentQuestion ? "flex flex-col" : "hidden"}`}>
                          <div className="bg-[#FFF] p-6 rounded-[5px]">
                            <p className="mb-4">
                              <b>{i + 1}</b>. {q.title}
                            </p>
                            <div>
                              {q.answer.filter((c) => c.is_correct).length >
                              1 ? (
                                <div>
                                  <Form.Item
                                    name={[q.title, "answer"]}
                                    className="mb-0! test-form-item-multiple"
                                    valuePropName="checked">
                                    <Checkbox.Group
                                      options={q.answer.map((a) => a.title)}
                                    />
                                  </Form.Item>
                                </div>
                              ) : (
                                <div>
                                  {q.answer.map((a) => (
                                    <Form.Item
                                      noStyle
                                      shouldUpdate={(
                                        prevValues,
                                        currentValues,
                                      ) =>
                                        prevValues[q.title] !==
                                        currentValues[q.title]
                                      }>
                                      {({ getFieldValue }) => (
                                        <Form.Item
                                          name={[q.title, "answer"]}
                                          className="mb-0! test-form-item">
                                          <Checkbox
                                            key={a.title}
                                            checked={
                                              getFieldValue([
                                                q.title,
                                                "answer",
                                              ]) === a.title
                                            }
                                            onChange={() =>
                                              form.setFieldValue(
                                                [q.title, "answer"],
                                                a.title,
                                              )
                                            }>
                                            {a.title}
                                          </Checkbox>
                                        </Form.Item>
                                      )}
                                    </Form.Item>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) =>
                          prevValues[data.question[currentQuestion].title] !==
                          currentValues[data.question[currentQuestion].title]
                        }>
                        {() => {
                          const isLastQuestion =
                            currentQuestion >= data.question.length - 1;
                          const navigation = (
                            <div
                              className={
                                footerSlot
                                  ? "test-nav-footer"
                                  : "flex justify-between items-center mt-4"
                              }>
                              {currentQuestion > 0 ? (
                                <Button
                                  size="large"
                                  className={
                                    footerSlot
                                      ? "main-secondary-cta-button"
                                      : ""
                                  }
                                  onClick={() =>
                                    setCurrentQuestion(currentQuestion - 1)
                                  }
                                  icon={<RxChevronLeft />}>
                                  {shortNavLabels
                                    ? t("Previous")
                                    : t("Previous question")}
                                </Button>
                              ) : (
                                <div></div>
                              )}
                              {footerSlot && (
                                <p className="test-nav-counter">
                                  <b>{currentQuestion + 1}</b> /{" "}
                                  {data.question.length}
                                </p>
                              )}
                              {!isLastQuestion ? (
                                <Button
                                  className="main-cta-button"
                                  size="large"
                                  type="primary"
                                  onClick={() =>
                                    setCurrentQuestion(currentQuestion + 1)
                                  }
                                  icon={<RxChevronRight />}
                                  iconPlacement="end">
                                  {shortNavLabels
                                    ? t("Next")
                                    : t("Next question")}
                                </Button>
                              ) : (
                                <Button
                                  className="main-cta-button"
                                  size="large"
                                  type="primary"
                                  onClick={form.submit}>
                                  {t("Finish")}
                                </Button>
                              )}
                            </div>
                          );
                          // Fixa no fundo do ecrã (fora do scroll), para avançar sem procurar os botões
                          // em perguntas com muitas opções
                          return footerSlot
                            ? createPortal(navigation, footerSlot)
                            : navigation;
                        }}
                      </Form.Item>
                    </div>
                  </Form>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
export default Test;
