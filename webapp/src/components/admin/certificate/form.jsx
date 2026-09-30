import { Form, Input } from "antd";

import Media from "../media/media";
import { useTranslation } from "react-i18next";
import TipTapFormField from "../tipTap/tipTapFormField";
import { fileTypeRule } from "../../../utils/fileValidation";
import { requiredRule } from "../../../utils/formFieldError";
import useMediaPicker from "../../../utils/useMediaPicker";
import MediaField from "../../../utils/mediaField";

// Tipo de ficheiro aceite por cada campo da Multimédia
const FIELD_TYPES = { background: "image" };

// errors = useFormErrors(form) do CertificateDetails: o botão Save (fora do formulário) usa errors.submit
export default function CertificateForm({ form, submit, preview, errors }) {
  const { t } = useTranslation();
  const media = useMediaPicker(form, FIELD_TYPES, t);

  return (
    <div className="flex flex-col">
      <Media
        mediaKey={media.mediaKey}
        open={media.isOpenMedia}
        close={media.closeMedia}
      />
      <Form
        form={form}
        onFinish={submit}
        onFieldsChange={errors.onFieldsChange}
        layout="vertical"
        onValuesChange={preview}>
        <Form.Item name="id" hidden>
          <Input size="large" />
        </Form.Item>
        <Form.Item name="name" label={t("Name")} rules={[requiredRule]}>
          <Input size="large" />
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.background !== currentValues.background
          }>
          {({ getFieldValue }) => (
            <>
              <MediaField
                label={t("Background")}
                value={getFieldValue("background")}
                error={
                  media.selectionError("background") ||
                  errors.errorOf("background", getFieldValue("background"))
                }
                placeholder={t("Add multimedia")}
                onOpen={() => media.openMedia("background")}
                onRemove={() => media.setMediaValue("background", null)}
              />
              <Form.Item
                name="background"
                hidden
                rules={[requiredRule, fileTypeRule("image", t)]}>
                <Input />
              </Form.Item>
            </>
          )}
        </Form.Item>
        <Form.Item name={"text"} className="mb-0!" label={t("Text")}>
          <TipTapFormField placeholder="Escreva o conteúdo..." />
        </Form.Item>
      </Form>
    </div>
  );
}
