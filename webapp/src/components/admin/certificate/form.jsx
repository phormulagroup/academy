import { useEffect, useState } from "react";
import { Button, Form, Input, Radio, Switch, Tooltip } from "antd";
import { AiOutlineFile } from "react-icons/ai";
import { LuAlignCenter, LuAlignLeft, LuAlignRight, LuFileText, LuImage, LuSettings } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import Media from "../media/media";
import RichTextFormField from "../richText/richTextFormField";
import { SettingsSection } from "../settingsSection";
import PositionPad from "./positionPad";
import config from "../../../utils/config";
import { fileTypeRule } from "../../../utils/fileValidation";
import { requiredRule } from "../../../utils/formFieldError";
import useMediaPicker from "../../../utils/useMediaPicker";

// Tipo de ficheiro aceite por cada campo da Multimédia
const FIELD_TYPES = { background: "image" };

// Fundo ideal: A4 horizontal (297 x 210 mm), proporção 842:595. 300 dpi dá 3508 x 2480 px; abaixo de 2000 px de largura nota-se a falta de nitidez
const PAGE_RATIO = 842 / 595;
const RECOMMENDED = "3508 × 2480 px";
const MIN_WIDTH = 2000;

// Lê as dimensões da imagem escolhida e avisa quando não é A4 horizontal (o PDF mantém a proporção e corta o que sobra, centrado)
function BackgroundHint({ background, t }) {
  const [size, setSize] = useState(null);
  useEffect(() => {
    setSize(null);
    if (!background) return;
    const img = new Image();
    img.onload = () => setSize({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = `${config.server_ip}/media/${encodeURIComponent(background)}`;
  }, [background]);

  const ratioOff = size && Math.abs(size.width / size.height - PAGE_RATIO) / PAGE_RATIO > 0.02;
  const small = size && size.width < MIN_WIDTH;
  return (
    <div className="mt-2 text-[12px] text-[#8A8D98] flex flex-col gap-1">
      <p className="mb-0!">{t("Recommended: A4 landscape (297 × 210 mm), {{size}} (300 dpi), PNG or JPG", { size: RECOMMENDED })}</p>
      {size && (
        <p className="mb-0!">
          {t("Chosen image: {{width}} × {{height}} px", { width: size.width, height: size.height })}
        </p>
      )}
      {ratioOff && <p className="mb-0! text-[#D4880F]">{t("This image is not A4 landscape: it keeps its proportions and is cropped from the centre to fill the page, so the edges may be cut off")}</p>}
      {small && <p className="mb-0! text-[#D4880F]">{t("This image is small for a printed certificate and may look blurry. Use at least {{width}} px wide", { width: MIN_WIDTH })}</p>}
    </div>
  );
}

// Variáveis que o texto aceita, substituídas pelos dados de cada aluno ao gerar o certificado
const VARIABLES = [
  { key: "name", label: "Student name", hint: "The name of the person who completed the course" },
  { key: "course", label: "Course name", hint: "The name of the course" },
  { key: "date", label: "Completion date", hint: "The date the student completed the course" },
];

// Posição inicial ao passar de automática a manual: onde o bloco já estava, pelo alinhamento
const DEFAULT_POSITION = { left: { x: 32, y: 50 }, center: { x: 50, y: 50 }, right: { x: 68, y: 50 } };

// Formulário do modelo de certificado, em cartões por secção (mesma organização das Definições do curso); a
// pré-visualização fica ao lado, na página (pages/admin/certificate/details.jsx).
// errors = useFormErrors(form) do CertificateDetails; preview = chamado a cada alteração (marca "por guardar" e
// atualiza a pré-visualização).
// alignSupported / positionSupported: false enquanto a BD não tiver as colunas text_align / text_x / text_y (ver
// server/database/migrations): os controlos aparecem mas desativados.
export default function CertificateForm({ form, submit, preview, errors, alignSupported = true, positionSupported = true }) {
  const { t } = useTranslation();
  const media = useMediaPicker(form, FIELD_TYPES, t);

  // Escolher/remover a imagem não passa pelo onValuesChange do Form: avisa a página à mão
  function closeMedia(res) {
    media.closeMedia(res);
    if (res) preview?.();
  }

  // Insere a variável no fim do texto (antes do último </p>, para ficar na última linha e não num parágrafo novo):
  // o editor não expõe a posição do cursor, por isso o fim é o sítio previsível
  function insertVariable(variable) {
    const current = form.getFieldValue("text") || "";
    const next = current.includes("</p>") ? current.replace(/<\/p>(?![\s\S]*<\/p>)/, ` ${variable}</p>`) : `<p>${`${current} ${variable}`.trim()}</p>`;
    form.setFieldValue("text", next);
    preview?.();
  }

  const unsupportedNote = (columns) => `${t("Unavailable until the database is updated")} (${columns})`;

  return (
    <div className="flex flex-col">
      <Media mediaKey={media.mediaKey} fileType={media.fileType} open={media.isOpenMedia} close={closeMedia} />
      <Form form={form} onFinish={submit} onFieldsChange={errors.onFieldsChange} layout="vertical" onValuesChange={preview}>
        <Form.Item name="id" hidden>
          <Input size="large" />
        </Form.Item>

        <SettingsSection id="certificate-general" icon={<LuSettings />} title={t("General")} description={t("The name only identifies this template in the dashboard")}>
          <Form.Item name="name" label={t("Name")} rules={[requiredRule]} className="mb-0!">
            <Input size="large" />
          </Form.Item>
        </SettingsSection>

        <SettingsSection
          id="certificate-background"
          icon={<LuImage />}
          title={t("Background")}
          description={t("The certificate image (the whole page, A4 landscape). The text is drawn on top")}>
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.background !== currentValues.background}>
            {({ getFieldValue }) => {
              const background = getFieldValue("background");
              const error = media.selectionError("background") || errors.errorOf("background", background);
              return (
                <>
                  <div
                    className={`border border-dashed ${error ? "border-red-500" : "border-gray-300"} rounded-lg cursor-pointer flex justify-center items-center w-full aspect-[842/595] overflow-hidden bg-cover bg-center bg-no-repeat`}
                    onClick={() => media.openMedia("background")}
                    style={background ? { backgroundImage: `url(${config.server_ip}/media/${encodeURIComponent(background)})` } : undefined}>
                    {!background && (
                      <div className="flex justify-center items-center flex-col p-10">
                        <AiOutlineFile className="text-[30px]" />
                        <p className="text-[11px] text-center mt-2">{t("Add multimedia")}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-[12px] text-[#8A8D98] mb-0! truncate">{background || t("No image chosen")}</p>
                    <div className="flex shrink-0 gap-2">
                      <Button size="small" onClick={() => media.openMedia("background")}>
                        {background ? t("Change image") : t("Choose image")}
                      </Button>
                      {background && (
                        <Button
                          size="small"
                          danger
                          onClick={() => {
                            media.setMediaValue("background", null);
                            preview?.();
                          }}>
                          {t("Remove")}
                        </Button>
                      )}
                    </div>
                  </div>
                  <BackgroundHint background={background} t={t} />
                  {error && <p className="text-[12px] text-red-500 mt-1! mb-0!">{error}</p>}
                  <Form.Item name="background" hidden rules={[requiredRule, fileTypeRule("image", t)]}>
                    <Input />
                  </Form.Item>
                </>
              );
            }}
          </Form.Item>
        </SettingsSection>

        <SettingsSection id="certificate-text" icon={<LuFileText />} title={t("Text")} description={t("The text that appears on the certificate. Use the variables for each student's data")}>
          {/* Alinhamento do texto: também decide de que lado da página o bloco fica (esquerda → margem esquerda, centro →
              ao meio, direita → margem direita). Em posição automática o bloco fica sempre centrado na vertical. */}
          <Form.Item
            name="text_align"
            label={t("Text alignment")}
            tooltip={t("Aligns the text and places the block on the page: left, center or right")}
            extra={alignSupported ? undefined : unsupportedNote("text_align")}>
            <Radio.Group
              block
              size="large"
              optionType="button"
              buttonStyle="solid"
              disabled={!alignSupported}
              options={[
                { value: "left", label: <span className="inline-flex items-center justify-center gap-2"><LuAlignLeft /> {t("Left")}</span> },
                { value: "center", label: <span className="inline-flex items-center justify-center gap-2"><LuAlignCenter /> {t("Center")}</span> },
                { value: "right", label: <span className="inline-flex items-center justify-center gap-2"><LuAlignRight /> {t("Right")}</span> },
              ]}
            />
          </Form.Item>

          {/* Posição do bloco de texto na página (X/Y em %, centro do bloco). Automática = ancorado pelo alinhamento e
              centrado na vertical. A pré-visualização ao lado mostra o resultado real. */}
          <Form.Item name="text_x" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="text_y" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, current) => prev.text_x !== current.text_x || prev.text_y !== current.text_y || prev.text_align !== current.text_align || prev.background !== current.background}>
            {({ getFieldValue }) => {
              const x = getFieldValue("text_x");
              const y = getFieldValue("text_y");
              const isAuto = x === null || x === undefined || y === null || y === undefined;
              const defaults = DEFAULT_POSITION[getFieldValue("text_align") || "left"];
              return (
                <div className="mb-6">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <p className="mb-0!">{t("Text position")}</p>
                      <p className="text-[12px] text-[#8A8D98] mb-0!">
                        {isAuto
                          ? t("Automatic: next to the margin according to the alignment, and centered vertically")
                          : t("Drag the rectangle (the text block) or enter the percentage; the point is the center of the block")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[12px] text-[#666]">{t("Automatic")}</span>
                      <Switch
                        checked={isAuto}
                        disabled={!positionSupported}
                        onChange={(auto) => {
                          form.setFieldsValue(auto ? { text_x: null, text_y: null } : { text_x: defaults.x, text_y: defaults.y });
                          preview?.();
                        }}
                      />
                    </div>
                  </div>
                  {!positionSupported && <p className="text-[12px] text-[#8A8D98] mb-2!">{unsupportedNote("text_x / text_y")}</p>}
                  {!isAuto && (
                    <PositionPad
                      x={Number(x)}
                      y={Number(y)}
                      background={getFieldValue("background")}
                      disabled={!positionSupported}
                      onChange={({ x: nextX, y: nextY }) => {
                        form.setFieldsValue({ text_x: nextX, text_y: nextY });
                        preview?.();
                      }}
                    />
                  )}
                </div>
              );
            }}
          </Form.Item>

          <p className="mb-2!">{t("Text")}</p>
          <Form.Item name={"text"} className="mb-0!">
            <RichTextFormField placeholder={t("Write the content...")} />
          </Form.Item>
          <div className="mt-3 rounded-[12px] bg-[#F6F7F9] p-3">
            <p className="text-[12px] text-[#8A8D98] mb-2!">{t("Variables: click to insert at the end of the text")}:</p>
            <div className="flex flex-wrap gap-2">
              {VARIABLES.map((variable) => (
                <Tooltip key={variable.key} title={t(variable.hint)}>
                  <button
                    type="button"
                    onClick={() => insertVariable(`{{${variable.key}}}`)}
                    className="cursor-pointer rounded-[8px] border border-solid border-[#D9D9D9] bg-white px-3 py-1 text-[12px] transition-colors hover:border-[#163986] hover:text-[#163986]">
                    <code>{`{{${variable.key}}}`}</code> <span className="text-[#8A8D98]">{t(variable.label)}</span>
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>
        </SettingsSection>
      </Form>
    </div>
  );
}
