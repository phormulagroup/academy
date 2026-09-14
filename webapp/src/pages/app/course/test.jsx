import { useTranslation } from "react-i18next";
import { useContext, useEffect, useRef, useState } from "react";
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
  RxClock,
  RxFileText,
  RxLockClosed,
  RxReload,
} from "react-icons/rx";
import axios from "axios";
import endpoints from "../../../utils/endpoints";
import { Context } from "../../../utils/context";
import trailLoadingAnimation from "../../../assets/Trail-loading.json";
import dayjs from "dayjs";
import Lottie from "lottie-react";
import { Helmet } from "react-helmet";

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
}) => {
  const { user, messageApi } = useContext(Context);
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
  const [isTopicLocked, setIsTopicLocked] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [countdownToBeAvailable, setCountdownToBeAvailable] = useState("");

  const { t } = useTranslation();
  const [form] = Form.useForm();
  const timerRef = useRef(null);
  const timerAvailableRef = useRef(null);

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

    prepareData();

    console.log(course);
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

    if (aux.settings.start_date) {
      const date1 = dayjs();
      const date2 = dayjs(aux.settings.start_date);

      if (date1.diff(date2) < 0) {
        setIsAvailable(false);
        setCountdownToBeAvailable(
          <div className="flex flex-col justify-center items-center mt-4">
            <Lottie
              animationData={trailLoadingAnimation}
              loop={true}
              className="max-w-20"
            />
          </div>,
        );
        startAvailableTimer(aux.settings.start_date);
      }
    }
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

  function startAvailableTimer(date) {
    const countDownDate = new Date(date).getTime();
    // limpa interval antigo antes de criar outro
    if (timerAvailableRef.current) clearInterval(timerAvailableRef.current);

    timerAvailableRef.current = setInterval(() => {
      const now = new Date().getTime();
      const distance = countDownDate - now;

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      let timer = `${days} d | ${hours} h | ${minutes} min`;

      if (days === 0) {
        if (hours === 0 && minutes === 0) {
          timer = `${seconds} s`;
        } else if (hours === 0) {
          timer = `${minutes} min | ${seconds} s`;
        } else {
          timer = `${hours} h | ${minutes} min | ${seconds} s`;
        }
      }

      setCountdownToBeAvailable(
        <div className="flex flex-col justify-center items-center border rounded-[5px] border-[#707070] p-6 mt-4">
          <p>{t("Time to be available:")}</p>
          <p className="text-[30px]">{timer}</p>
        </div>,
      );

      if (--timer < 0) {
        setIsAvailable(true);
        clearInterval(timerAvailableRef.current);
      }
    }, 1000);
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
      messageApi.open({
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
            if (typeof values[questions[index]].answer === "string") {
              const auxQuestion = data.question.filter(
                (q) => q.title === questions[index],
              )[0];
              const findCorrectAnswer = auxQuestion.answer.filter(
                (a) => a.is_correct,
              );
              if (findCorrectAnswer.length > 0) {
                auxResult.push({
                  is_correct:
                    values[questions[index]].answer ===
                    findCorrectAnswer[0].title,
                  ...auxQuestion,
                  myAnswer: values[questions[index]].answer,
                });
              }
            } else {
              let is_correct = true;
              const auxQuestion = data.question.filter(
                (q) => q.title === questions[index],
              )[0];
              const findCorrectAnswer = auxQuestion.answer.filter(
                (a) => a.is_correct,
              );
              if (findCorrectAnswer.length > 0) {
                for (let y = 0; y < findCorrectAnswer.length; y++) {
                  const findInMyAnswers = values[
                    questions[index]
                  ].answer.filter((a) => a === findCorrectAnswer[y].title);
                  if (findInMyAnswers.length === 0) {
                    is_correct = false;
                  }
                }

                auxResult.push({
                  is_correct,
                  ...auxQuestion,
                  myAnswer: values[questions[index]].answer,
                });
              }
            }
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
      .then((res) => {
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
          {isTopicLocked ? (
            <div className="p-4 flex items-center bg-[#FF7D5A] text-white mt-4">
              <RxLockClosed className="w-10 h-10 mr-2" />
              <div>
                <p className="text-[20px] font-bold">
                  {t("This test is locked")}
                </p>
                <p>{t("You'll need to complete the previous topic first")}</p>
              </div>
            </div>
          ) : (
            Object.keys(data).length > 0 && (
              <div>
                {!isAvailable ? (
                  <div>{countdownToBeAvailable}</div>
                ) : !begin ? (
                  <div className="flex flex-col justify-center items-center border border-[#707070] p-6 rounded-[5px] mt-4">
                    <p className="text-[16px]">
                      <b>{t("Approval percentage")}:</b>{" "}
                      {data.settings.passing_score}%
                    </p>
                    {data.settings.time && (
                      <p className="text-[16px]">
                        <b>{t("Time")}:</b> {data.settings.time} minutes
                      </p>
                    )}
                    {data.settings.retries_allowed && (
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
                      className="mt-4"
                      type="primary"
                      size="large">
                      {t("Start test")}
                    </Button>
                  </div>
                ) : isCalculating ? (
                  <div className="flex flex-col justify-center items-center p-6 bg-white mt-4">
                    <p className="mb-4 text-[24px] font-bold">
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
                      const retriesAllowed =
                        data.settings?.retries_allowed ?? 5;
                      const retriesUsed = progress.filter(
                        (p) =>
                          p.activity_type === "test" &&
                          p.id_course_test === selectedCourseItem.id,
                      ).length;
                      const canStillRetry = retriesUsed < retriesAllowed;

                      return (
                        <>
                          {/* LAYOUT UNIFICADO DE RESULTADOS PARA APROVADO, REPROVADO E EM ANDAMENTO */}
                          <div className="flex flex-col justify-center items-center p-6 bg-white mt-4 rounded-lg">
                            <p className="mb-4 font-bold text-[24px]">
                              {t("Result")}
                            </p>
                            {isApproved ? (
                              <AiFillCheckCircle className="text-[80px] text-[#2F8351]" />
                            ) : (
                              <AiFillCloseCircle className="text-[80px] text-[#DB0709]" />
                            )}
                            <p className="mt-4 mb-4 text-[24px] font-bold">
                              {isApproved
                                ? t("Approved")
                                : canStillRetry
                                  ? t("Failed test")
                                  : t("Repproved Test")}
                            </p>
                            <p className="text-[16px] mt-4">
                              <b>{t("Your tries")}:</b>{" "}
                              {
                                progress.filter(
                                  (p) =>
                                    p.activity_type === "test" &&
                                    p.id_course === course.id &&
                                    p.id_course_test === selectedCourseItem.id,
                                ).length
                              }
                              {data.settings?.retries_allowed ? (
                                <> / {data.settings?.retries_allowed}</>
                              ) : null}
                            </p>
                            <p className="mt-4">Your percentage:</p>
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
                            <div className="p-4 flex items-center bg-[#FF7D5A] text-white mt-4 rounded-lg">
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
                                className="flex-1"
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
                        className={`p-6 flex flex-col bg-[#EAEAEA] ${review ? "flex mt-4 w-full" : "hidden"}`}>
                        <div className="flex justify-between">
                          <p className="mb-4">
                            <b>{i + 1}</b>. {q.title}
                          </p>
                        </div>
                        <div>
                          {q.answer.filter((c) => c.is_correct).length > 1 ? (
                            <div>
                              {q.answer.map((a, index) => (
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
                              {q.answer.map((a, index) => (
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
                ) : timerEnded ? (
                  <div className="p-4 flex items-center bg-[#FF7D5A] text-white mt-4">
                    <RxClock className="w-10 h-10 mr-2" />
                    <div>
                      <p className="text-[20px] font-bold">
                        {t("Timer ended")}
                      </p>
                      <p>{t("The time ended, please try again")}</p>
                    </div>
                  </div>
                ) : (
                  <Form form={form} onFinish={submit}>
                    <div className="p-4 bg-black mt-4">
                      <div className=" flex justify-between items-center">
                        <p className="text-[20px] text-white">
                          {t("Limit time")}
                        </p>
                        <div>
                          <p className="text-white text-[20px] font-bold">
                            {countdown}
                          </p>
                        </div>
                      </div>
                      <Progress
                        percent={timePercentage}
                        showInfo={false}
                        railColor={"#FFF"}
                        strokeColor={"#00B9D6"}
                      />
                    </div>

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
                          <div className={`bg-[#FFF] p-6 `}>
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
                                  {q.answer.map((a, index) => (
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
                        {({ getFieldValue }) => {
                          return (
                            <div className="flex justify-between items-center mt-4">
                              {currentQuestion > 0 ? (
                                <Button
                                  size="large"
                                  onClick={() =>
                                    setCurrentQuestion(currentQuestion - 1)
                                  }
                                  icon={<RxChevronLeft />}>
                                  {t("Previous question")}
                                </Button>
                              ) : (
                                <div></div>
                              )}
                              {currentQuestion < data.question.length - 1 ? (
                                <Button
                                  size="large"
                                  type="primary"
                                  onClick={() =>
                                    setCurrentQuestion(currentQuestion + 1)
                                  }
                                  icon={<RxChevronRight />}
                                  iconPlacement="end">
                                  {t("Next question")}
                                </Button>
                              ) : (
                                <Button
                                  size="large"
                                  type="primary"
                                  onClick={form.submit}>
                                  {t("Finish")}
                                </Button>
                              )}
                            </div>
                          );
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
