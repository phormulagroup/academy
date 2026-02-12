import { useTranslation } from "react-i18next";
import { Render } from "@puckeditor/core";
import { configRender } from "../../../components/editor";
import { useEffect, useRef, useState } from "react";
import { Button, Checkbox, Form, Input, Progress, Radio } from "antd";
import { AiFillCheckCircle, AiOutlineArrowLeft, AiOutlineCheck, AiOutlineClose } from "react-icons/ai";
import { RxArrowLeft, RxChevronLeft, RxChevronRight, RxFile, RxFileText, RxReload } from "react-icons/rx";

const Test = ({ selectedCourseItem, progress, progressPercentage }) => {
  const [data, setData] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [calculate, setCalculate] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [begin, setBegin] = useState(false);
  const [timerEnded, setTimerEnded] = useState(false);
  const [review, setReview] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [timePercentage, setTimePercentage] = useState(100);
  const [result, setResult] = useState([]);
  const [finished, setFinished] = useState(false);
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const timerRef = useRef(null);

  useEffect(() => {
    if (selectedCourseItem.type === "test") prepareData();
  }, [selectedCourseItem]);

  function prepareData() {
    let aux = Object.assign({}, selectedCourseItem);
    aux.question = aux.question ? shuffleArray(JSON.parse(aux.question)) : [];
    for (let i = 0; i < aux.question.length; i++) {
      if (aux.question[i].answer && aux.question[i].answer.length > 0) {
        aux.question[i].answer = shuffleArray(aux.question[i].answer);
      }
    }
    if (aux.time) {
      let timer = aux.time * 60,
        minutes,
        seconds;
      minutes = parseInt(timer / 60, 10);
      seconds = parseInt(timer % 60, 10);

      minutes = minutes < 10 ? "0" + minutes : minutes;
      seconds = seconds < 10 ? "0" + seconds : seconds;
      setCountdown(minutes + ":" + seconds);
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

      if (--timer < 0) {
        setTimerEnded(true);
        clearInterval(interval);
      }
    }, 1000);
  }

  function startTest() {
    setBegin(true);
    startTimer(data.time * 60);
  }

  function restartTest() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setResult({});
    setTimePercentage(100);
    setReview(false);
    setCurrentQuestion(0);
    setCalculate({});
    setTimerEnded(false);
    setFinished(false);
    prepareData();
    form.resetFields();
    startTimer(data.time * 60);
  }

  function submit(values) {
    const isValid = Object.keys(values).map((key) => values[key]?.answer && (!Array.isArray(values[key].answer) || values[key].answer.length > 0));

    if (isValid.filter((item) => !item).length > 0) {
      console.log("falta a resposta");
    } else {
      setIsCalculating(true);
      const questions = Object.keys(values);

      let index = 0;
      let auxResult = [];

      const interval = setInterval(() => {
        if (index < questions.length) {
          if (values[questions[index]]) {
            if (typeof values[questions[index]].answer === "string") {
              const auxQuestion = data.question.filter((q) => q.title === questions[index])[0];
              const findCorrectAnswer = auxQuestion.answer.filter((a) => a.is_correct);
              if (findCorrectAnswer.length > 0) {
                auxResult.push({ is_correct: values[questions[index]].answer === findCorrectAnswer[0].title, ...auxQuestion, myAnswer: values[questions[index]].answer });
              }
            } else {
              let is_correct = true;
              const auxQuestion = data.question.filter((q) => q.title === questions[index])[0];
              const findCorrectAnswer = auxQuestion.answer.filter((a) => a.is_correct);
              if (findCorrectAnswer.length > 0) {
                for (let y = 0; y < values[questions[index]].answer.length; y++) {
                  console.log(findCorrectAnswer);
                  console.log(values[questions[index]].answer[y]);
                  if (findCorrectAnswer.filter((q) => q.title === values[questions[index]].answer[y]).length === 0) {
                    is_correct = false;
                  }
                }

                auxResult.push({ is_correct, ...auxQuestion, myAnswer: values[questions[index]].answer });
              }
            }
          }

          setCalculate({ percentage: ((index + 1) * 100) / questions.length, step: `${index + 1} / ${questions.length}` });
        }

        setResult(auxResult);
        setFinished(true);

        index++;

        if (index === questions.length + 1) {
          clearInterval(interval);
          setIsCalculating(false);
          console.log("Terminou!");
        }
      }, 1500);
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
          {Object.keys(data).length > 0 && (
            <div>
              {!begin ? (
                <div>
                  <Button onClick={startTest}>{t("Start test")}</Button>
                </div>
              ) : isCalculating ? (
                <div className="flex flex-col justify-center items-center p-6 bg-white mt-4">
                  <p className="mb-4 text-[24px] font-bold">{t("Calculating...")}</p>
                  <Progress percent={calculate.percentage} showInfo={false} />
                  {calculate.step ? <p className="font-bold mt-4 text-center">{calculate.step}</p> : <p className="font-bold mt-4 text-center">0 / {data.question?.length}</p>}
                </div>
              ) : finished ? (
                <div className="flex flex-col mt-4">
                  <p>
                    <b>{result.filter((r) => r.is_correct).length}</b> {t("of")} <b>{result.length}</b> {t("questions answered correctly.")}
                  </p>
                  <div className="flex flex-col justify-center items-center p-6 bg-white mt-4">
                    <p className="mb-4 font-bold text-[24px]">{t("Result")}</p>
                    <AiFillCheckCircle className="text-[80px] text-[#2F8351]" />
                    <p className="mt-4 mb-4 text-[24px] font-bold">
                      {t("You obtained")} {result.filter((r) => r.is_correct).length} {t("of")} {result.length}
                    </p>
                    <div className="flex mb-4 mt-4">
                      <Button size="large" className="blue mr-2" onClick={() => setReview(true)} icon={<RxFileText />}>
                        {t("Review questions")}
                      </Button>
                      <Button size="large" onClick={() => restartTest()} icon={<RxReload />}>
                        {t("Restart test")}
                      </Button>
                    </div>
                    {result.map((q, i) => (
                      <div className={`p-6 flex flex-col bg-[#EAEAEA] ${review ? "flex mt-4 w-full" : "hidden"}`}>
                        <p className="mb-4">
                          <b>{i + 1}</b>. {q.title}
                        </p>
                        <div>
                          {q.answer.filter((c) => c.is_correct).length > 1 ? (
                            <div>
                              {q.answer.map((a, index) => (
                                <div
                                  className={`review-test-question multiple ${q.myAnswer.includes(a.title) && q.is_correct ? "correct" : q.myAnswer.includes(a.title) && !a.is_correct ? "incorrect" : a.is_correct ? "correct" : ""}`}
                                >
                                  <div className="flex">
                                    <div className={`circle flex justify-center items-center`}>
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
                                    {q.myAnswer.includes(a.title) && a.is_correct && <AiOutlineCheck className="mr-2 text-[#2F8351]" />}
                                    {q.myAnswer.includes(a.title) && !a.is_correct && <AiOutlineClose className="mr-2 text-[#DB0709]" />}
                                    {q.myAnswer.includes(a.title) && !a.is_correct && <p className={"text-[#DB0709]"}>{t("Incorrect answer")}</p>}
                                    <p className={"text-[#2F8351]"}>{a.is_correct && t("Correct answer")}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div>
                              {q.answer.map((a, index) => (
                                <div className={`review-test-question ${a.title === q.myAnswer && !q.is_correct ? "incorrect" : a.is_correct ? "correct" : ""}`}>
                                  <div className="flex">
                                    <div className={`circle flex justify-center items-center`}>
                                      {a.title === q.myAnswer && <div className="w-3.5 h-3.5 bg-[#00B9D6] rounded-full"></div>}
                                    </div>
                                    <div>
                                      <p>{a.title}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center">
                                    {a.title === q.myAnswer && a.is_correct && <AiOutlineCheck className="mr-2 text-[#2F8351]" />}
                                    {a.title === q.myAnswer && !a.is_correct && <AiOutlineClose className="mr-2 text-[#DB0709]" />}
                                    {a.title === q.myAnswer && !a.is_correct && <p className={"text-[#DB0709]"}>{t("Incorrect answer")}</p>}
                                    <p className={"text-[#2F8351]"}>{a.is_correct && t("Correct answer")}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Form form={form} onFinish={submit}>
                  <div className="p-4 bg-black mt-4">
                    <div className=" flex justify-between items-center">
                      <p className="text-[20px] text-white">{t("Limit time")}</p>
                      <div>
                        <p className="text-white text-[20px] font-bold">{countdown}</p>
                      </div>
                    </div>
                    <Progress percent={timePercentage} showInfo={false} railColor={"#FFF"} strokeColor={"#00B9D6"} />
                  </div>

                  <div>
                    <p className="mb-4 mt-4">
                      {t("Question")} <b>{currentQuestion + 1}</b> {t("of")} <b>{data.question.length}</b>
                    </p>
                  </div>
                  <div>
                    {data.question.map((q, i) => (
                      <div className={`${i === currentQuestion ? "flex flex-col" : "hidden"}`}>
                        <div className={`bg-[#FFF] p-6 `}>
                          <p className="mb-4">
                            <b>{i + 1}</b>. {q.title}
                          </p>
                          <div>
                            {q.answer.filter((c) => c.is_correct).length > 1 ? (
                              <div>
                                <Form.Item name={[q.title, "answer"]} className="mb-0! test-form-item-multiple" valuePropName="checked">
                                  <Checkbox.Group options={q.answer.map((a) => a.title)} />
                                </Form.Item>
                              </div>
                            ) : (
                              <div>
                                {q.answer.map((a, index) => (
                                  <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues[q.title] !== currentValues[q.title]}>
                                    {({ getFieldValue }) => (
                                      <Form.Item name={[q.title, "answer"]} className="mb-0! test-form-item">
                                        <Checkbox
                                          key={a.title}
                                          checked={getFieldValue([q.title, "answer"]) === a.title}
                                          onChange={() => form.setFieldValue([q.title, "answer"], a.title)}
                                        >
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
                      shouldUpdate={(prevValues, currentValues) => prevValues[data.question[currentQuestion].title] !== currentValues[data.question[currentQuestion].title]}
                    >
                      {({ getFieldValue }) => {
                        return (
                          <div className="flex justify-between items-center mt-4">
                            {currentQuestion > 0 ? (
                              <Button size="large" onClick={() => setCurrentQuestion(currentQuestion - 1)} icon={<RxChevronLeft />}>
                                {t("Previous question")}
                              </Button>
                            ) : (
                              <div></div>
                            )}
                            {currentQuestion < data.question.length - 1 ? (
                              <Button size="large" type="primary" onClick={() => setCurrentQuestion(currentQuestion + 1)} icon={<RxChevronRight />} iconPlacement="end">
                                {t("Next question")}
                              </Button>
                            ) : (
                              <Button size="large" type="primary" onClick={form.submit}>
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
          )}
        </div>
      </div>
    </div>
  );
};
export default Test;
