import { useTranslation } from "react-i18next";
import { Render } from "@puckeditor/core";
import { configRender } from "../../../components/editor";
import { useEffect, useState } from "react";
import { Button, Checkbox, Form, Input, Progress, Radio } from "antd";
import { AiFillCheckCircle, AiOutlineCheck, AiOutlineClose } from "react-icons/ai";

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
  const [intervalTimer, setIntervalTimer] = useState();
  const { t } = useTranslation();
  const [form] = Form.useForm();

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
      startTimer(timer);
    }

    setData(aux);
    setResult({});
    setTimePercentage(100);
    setReview(false);
    setCurrentQuestion(0);
    setCalculate({});
    setTimerEnded(false);
    setFinished(false);
  }

  function startTimer(duration) {
    let timer = duration ?? 60 * 45,
      minutes,
      seconds;

    setIntervalTimer(
      setInterval(() => {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        setCountdown(minutes + ":" + seconds);
        setTimePercentage((timer * 100) / (duration ?? 60 * 45));

        if (--timer < 0) {
          setTimerEnded(true);
          clearInterval(intervalTimer);
        }
      }, 1000),
    );
  }

  function startTest() {
    setBegin(true);
    startTimer(data.time * 60);
  }

  function restartTest() {
    prepareData();
  }

  function submit(values) {
    const isValid = Object.keys(values).map((key) => values[key]?.answer && (!Array.isArray(values[key].answer) || values[key].answer.length > 0));

    if (isValid.filter((item) => !item).length > 0) {
      console.log("falta a resposta");
    } else {
      setIsCalculating(true);
      clearInterval(intervalTimer);
      const questions = Object.keys(values);

      let index = 0;
      let auxResult = [];

      const interval = setInterval(() => {
        if (index < questions.length) {
          console.log(index);
          if (values[questions[index]]) {
            console.log(values[questions[index]]);
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
                  if (!findCorrectAnswer.includes(values[questions[index]].answer[y])) {
                    is_correct = false;
                  }
                }

                auxResult.push({ is_correct, ...auxQuestion, myAnswer: values[questions[index]].answer });
              }
            }
          }

          setCalculate({ percentage: ((index + 1) * 100) / questions.length, step: `${index + 1} / ${questions.length}` });
        }

        console.log(auxResult);
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
            <p className="text-[20px] text-black font-bold">{selectedCourseItem.title}</p>
          )}
          {Object.keys(data).length > 0 && (
            <div>
              {!begin ? (
                <div>
                  <Button onClick={startTest}>{t("Start test")}</Button>
                </div>
              ) : isCalculating ? (
                <div className="flex flex-col">
                  <p className="mb-4">{t("Calculating...")}</p>
                  <Progress percent={calculate.percentage} />
                  <p className="font-bold mt-4">{calculate.step}</p>
                </div>
              ) : finished ? (
                <div>
                  <div className="flex flex-col justify-center items-center">
                    <AiFillCheckCircle className="text-[40px] text-[#2F8351]" />
                    <p>
                      {result.filter((r) => r.is_correct).length} / {result.length}
                    </p>
                    <div className="flex">
                      <Button onClick={() => setReview(true)}>{t("Review questions")}</Button>
                      <Button onClick={() => restartTest()}>{t("Restart test")}</Button>
                    </div>
                  </div>
                  {result.map((q, i) => (
                    <div className={`p-6 flex flex-col bg-[#FFF] ${review ? "flex" : "hidden"}`}>
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
                                    {a.title === q.myAnswer && <div className="w-[14px] h-[14px] bg-[#00B9D6] rounded-full"></div>}
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
                      <div className={`${i === currentQuestion ? "flex p-6 flex flex-col bg-[#FFF]" : "hidden"}`}>
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
                                        checked={form.getFieldValue([q.title, "answer"]) === a.title}
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
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    {currentQuestion > 0 ? <Button onClick={() => setCurrentQuestion(currentQuestion - 1)}>{t("Previous question")}</Button> : <div></div>}
                    {currentQuestion < data.question.length - 1 ? (
                      <Button onClick={() => setCurrentQuestion(currentQuestion + 1)}>{t("Next question")}</Button>
                    ) : (
                      <Button onClick={form.submit}>{t("Finish")}</Button>
                    )}
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
