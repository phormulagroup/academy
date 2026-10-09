import { useContext, useEffect, useRef } from "react";
import { useState } from "react";

import { Context } from "../../../../utils/context";
import PageFooter from "../../../../components/admin/pageFooter";

import { useTranslation } from "react-i18next";
import { Button, Empty, Form, Input, InputNumber, Space, Switch, Spin} from "antd";
import { RxArrowDown, RxArrowUp, RxTrash } from "react-icons/rx";
import { TbTrash } from "react-icons/tb";

// Valida se as perguntas e respostas estão corretas
const validateQuestions = (questions) => {
  
  // Verifica se há perguntas
  if (!questions || questions.length === 0) {
    return false;
  }

  // Verifica cada pergunta - TODAS devem ser válidas
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    
    // Verifica se a pergunta tem um título (deve ser uma string não vazia)
    const hasTitle = question && question.title && typeof question.title === "string" && question.title.trim() !== "";
    if (!hasTitle) {
      return false;
    }

    // Verifica se a pergunta tem pelo menos 2 respostas
    const hasAnswerArray = question.answer && Array.isArray(question.answer) && question.answer.length >= 2;
    if (!hasAnswerArray) {
      return false;
    }

    // Verifica se todas as respostas têm títulos não vazios
    for (let j = 0; j < question.answer.length; j++) {
      const answer = question.answer[j];
      const hasAnswerText = answer && answer.title && typeof answer.title === "string" && answer.title.trim() !== "";
      if (!hasAnswerText) {
        return false;
      }
    }

    // Verifica se pelo menos uma resposta está marcada como correta
    const hasCorrectAnswer = question.answer.some(ans => ans && ans.is_correct === true);
    if (!hasCorrectAnswer) {
      return false;
    }
  }

  return true;
};

/* ---------- Undo/Redo (mesma abordagem do construtor de módulos) ---------- */
// Alterações de texto seguidas no mesmo campo contam como um único passo
const HISTORY_DELAY = 800;
const MAX_HISTORY = 100;

const cloneQuestions = (questions) => structuredClone(questions || []);

// Nº de respostas de cada pergunta (muda quando se adiciona/remove uma pergunta ou resposta)
const questionsShape = (questions) => JSON.stringify((questions || []).map((q) => (q?.answer || []).length));

// Campos alterados (folhas) num changedValues do Form
const collectLeaves = (value, path, out) => {
  if (Array.isArray(value)) value.forEach((v, i) => collectLeaves(v, [...path, i], out));
  else if (value && typeof value === "object") Object.entries(value).forEach(([k, v]) => collectLeaves(v, [...path, k], out));
  else out.push({ path, value });
  return out;
};

export default function Question({ data, onSaveSuccess, isLoading, isActive = true }) {
  const { update } = useContext(Context);

  const { t } = useTranslation();

  const [form] = Form.useForm();
  const [canSaveButton, setCanSaveButton] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isUnsaved, setIsUnsaved] = useState(false);

  /* ---------- Undo/Redo ---------- */
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [historyData, setHistoryData] = useState(data);
  if (historyData !== data) {
    setHistoryData(data);
    setHistory([]);
    setFuture([]);
  }
  const prevQuestionsRef = useRef([]); // Perguntas antes da última alteração
  const typingRef = useRef(null); // Campo a ser escrito (agrupa as teclas num só passo)

  const endTyping = () => {
    if (typingRef.current) clearTimeout(typingRef.current.timer);
    typingRef.current = null;
  };

  const recordChange = (changedValues) => {
    if (!changedValues || !("question" in changedValues)) return;
    const before = prevQuestionsRef.current;
    const current = cloneQuestions(form.getFieldValue("question"));
    if (JSON.stringify(before) === JSON.stringify(current)) return;
    const leaves = collectLeaves(changedValues.question, [], []);
    const isTyping =
      leaves.length === 1 &&
      typeof leaves[0].value === "string" &&
      questionsShape(before) === questionsShape(current);
    const path = isTyping ? leaves[0].path.join(".") : null;
    if (!isTyping || typingRef.current?.path !== path) {
      setHistory((h) => [...h, before].slice(-MAX_HISTORY));
      setFuture([]);
    }
    endTyping();
    if (isTyping) typingRef.current = { path, timer: setTimeout(() => (typingRef.current = null), HISTORY_DELAY) };
    prevQuestionsRef.current = current;
  };

  const applyQuestions = (questions) => {
    endTyping();
    prevQuestionsRef.current = cloneQuestions(questions);
    form.setFieldsValue({ question: cloneQuestions(questions) });
    updateButtonState();
  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setFuture((f) => [cloneQuestions(form.getFieldValue("question")), ...f]);
    setHistory((h) => h.slice(0, -1));
    applyQuestions(prev);
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setHistory((h) => [...h, cloneQuestions(form.getFieldValue("question"))]);
    setFuture((f) => f.slice(1));
    applyQuestions(next);
  };

  useEffect(() => endTyping, []);

  const updateButtonState = () => {
    // Verifica se o formulário está válido e se há perguntas para salvar
    const formQuestions = form.getFieldValue("question") || [];
    const dbQuestions = data?.question || [];
    const isFormValid = formQuestions.length === 0 || validateQuestions(formQuestions);
    const canSave = (formQuestions.length > 0 && isFormValid) || (formQuestions.length === 0 && dbQuestions.length > 0);
    setCanSaveButton(canSave);
    // Alterações por guardar: as perguntas do formulário diferem das que vieram da base de dados
    setIsUnsaved(JSON.stringify(formQuestions) !== JSON.stringify(dbQuestions));
  };

  useEffect(() => {
    if (data) {
      form.resetFields();
      form.setFieldsValue(data);
      // Novo carregamento (ou depois de guardar): histórico limpo
      endTyping();
      prevQuestionsRef.current = cloneQuestions(form.getFieldValue("question"));
      // Atualiza o estado do botão de salvar após definir os valores do formulário
      setTimeout(() => updateButtonState(), 0);
    }
  }, [data, form]);

  const handleFormChange = () => {
    // Atualiza o estado do botão sempre que o formulário muda
    updateButtonState();
  };

  const handleValuesChange = (changedValues) => {
    recordChange(changedValues);
    handleFormChange();
  };

  const handleFieldsChange = () => {
    // Dispara a re-renderização para que a validação do botão seja recalculada
    handleFormChange();
  };

  const handleDeleteQuestion = (index) => {
    // Dispara a re-renderização após a exclusão para que o estado do botão seja atualizado
    handleFormChange();
  };

  async function submit(values) {
    try {
      setLoading(true);
      // console.log("💾 [submit] called with values:", values);
      const questions = values.question || [];
      // console.log("💾 [submit] questions:", questions);
      // console.log("💾 [submit] questions.length:", questions.length);
      
      // Valida as perguntas antes de enviar para a API
      if (questions.length > 0 && !validateQuestions(questions)) {
        setLoading(false);
        return;
      }

      if (values.question) values.question = JSON.stringify(values.question);
      // console.log("💾 [submit] Sending to API:", values);
      await update({ table: "test", data: values });
      // console.log("💾 [submit] Success!");
      setLoading(false);
      
      // Chama a função de callback para notificar o componente pai sobre a atualização bem-sucedida
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (err) {
      console.log("❌ [submit] Error:", err);
      setLoading(false);
    }
  }

  return (
    <div>
      <Spin spinning={isLoading} size="large">
        <Form 
          form={form} 
          onFinish={submit}
          onValuesChange={handleValuesChange}
          onFieldsChange={handleFieldsChange}
        >
          <Form.Item name="id" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.question !== currentValues.question}>
            {({ getFieldValue }) =>
              (!getFieldValue("question") || getFieldValue("question")?.length === 0) && (
                <div>
                  <Empty />
                </div>
              )
            }
          </Form.Item>
          <Form.List name="question">
            {(fields, { add, remove, move }) => (
              <div>
                {fields.map((field) => (
                  <div key={field.key} className={`p-6 flex flex-col bg-[#FFF] mb-4`}>
                    <div className="flex justify-between items-center mb-4">
                      <p className="font-bold">
                        {t("Question nº ")} {field.name + 1}
                      </p>
                      <div className="flex gap-4">
                        <div className="flex gap-2">
                          {field.name > 0 && <Button icon={<RxArrowUp />} onClick={() => move(field.name, field.name - 1)} />}
                          <Button icon={<RxArrowDown />} onClick={() => move(field.name, field.name + 1)} />
                        </div>
                        <Button icon={<RxTrash />} onClick={() => {
                          handleDeleteQuestion(field.name);
                          remove(field.name);
                        }}>
                          {t("Delete")}
                        </Button>
                      </div>
                    </div>
                    <Form.Item name={[field.name, "title"]}>
                      <Input size="large" className="font-semibold!" />
                    </Form.Item>
                    <Form.List name={[field.name, "answer"]}>
                      {(fieldsAnswer, { add, remove }) => (
                        <div className="p-6 border border-dashed ">
                          {fieldsAnswer.length > 0 && (
                            <div className={`grid grid-cols-8 gap-4 mb-4`}>
                              <div className="col-span-6">
                                <p>{t("Answers")}</p>
                              </div>
                              <div className="flex justify-center items-center">
                                <p>{t("Is correct")}</p>
                              </div>
                            </div>
                          )}
                          {fieldsAnswer.map((f) => (
                            <div key={f.key} className={`grid grid-cols-8 gap-4 mb-4`}>
                              <div className="col-span-6">
                                <Form.Item name={[f.name, "title"]} className="mb-0!">
                                  <Input size="large" className="font-normal!" />
                                </Form.Item>
                              </div>
                              <div className="flex justify-center items-center">
                                <Form.Item name={[f.name, "is_correct"]} className="mb-0!" valuePropName="checked">
                                  <Switch size="large" defaultValue={false} />
                                </Form.Item>
                              </div>
                              {fieldsAnswer.length > 1 && <Button size="large" onClick={() => remove(f.name)} icon={<TbTrash />}></Button>}
                            </div>
                          ))}
                          <div className="flex justify-center items-center">
                            <Button 
                              size="large" 
                              onClick={() => add()}
                            >
                              {t("Add answer")}
                            </Button>
                          </div>
                        </div>
                      )}
                    </Form.List>
                  </div>
                ))}
                <div className="flex justify-center items-center">
                  <Button 
                    size="large" 
                    className="mt-4" 
                    onClick={() => add()}
                  >
                    {t("Add question")}
                  </Button>
                </div>
              </div>
            )}
          </Form.List>
        </Form>
      </Spin>
      {/* Botões num rodapé fixo (components/admin/pageFooter.jsx), como no construtor de módulos: com muitas perguntas
          não é preciso fazer scroll até ao fim para anular, refazer ou guardar. */}
      <PageFooter active={isActive} className="justify-end px-4 md:px-6">
        <Space wrap className="justify-end">
          {isUnsaved && <span className="text-[12px] text-[#8A8D98]">{t("Unsaved changes")}</span>}
          <Button onClick={undo} disabled={!history.length || loading || isLoading}>
            {t("Undo")}
          </Button>
          <Button onClick={redo} disabled={!future.length || loading || isLoading}>
            {t("Redo")}
          </Button>
          <Button
            type="primary"
            onClick={form.submit}
            disabled={!canSaveButton || loading}
            loading={loading}
            title={
              !canSaveButton
                ? (form.getFieldValue("question") || []).length === 0 && (data?.question || []).length === 0
                  ? t("No questions to save")
                  : t("Please ensure all questions have titles, at least 2 answers each, and at least one correct answer")
                : ""
            }>
            {t("Save")}
          </Button>
        </Space>
      </PageFooter>
    </div>
  );
}
