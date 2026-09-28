import { useContext, useState } from "react";
import { Button, Drawer, Form, Input, Select } from "antd";

import { Context } from "../../../utils/context";
import Media from "../media/media";
import { useTranslation } from "react-i18next";
import PowerPointPdfNote from "./powerPointPdfNote";
import { powerPointPdfRule } from "./powerPointPdf";
import { fileTypeRule } from "../../../utils/fileValidation";
import { requiredListRule, requiredRule } from "../../../utils/formFieldError";
import useMediaPicker from "../../../utils/useMediaPicker";
import useFormErrors from "../../../utils/useFormErrors";
import FieldLabel from "../../../utils/fieldLabel";
import MediaField from "../../../utils/mediaField";

// Tipo de ficheiro aceite por cada campo da Multimédia (os ficheiros do download aceitam qualquer formato)
const FIELD_TYPES = { thumbnail: "image", banner: "image" };

export default function Create({ open, close, nameRule }) {
	const { create, selectedLanguage, languages } = useContext(Context);
	const [isButtonLoading, setIsButtonLoading] = useState(false);

	const { t } = useTranslation();

	const [form] = Form.useForm();
	const name = Form.useWatch("name", form);
	const items = Form.useWatch("items", form);
	const media = useMediaPicker(form, FIELD_TYPES, t);
	const errors = useFormErrors(form);

	function resetState() {
		form.resetFields();
		errors.reset();
		media.resetSelectionErrors();
	}

	function onClose() {
		resetState();
		close();
	}

	async function handleSubmit(values) {
		setIsButtonLoading(true);
		try {
			await create({
				data: { ...values, id_lang: selectedLanguage.id },
				table: "download",
			});
			setIsButtonLoading(false);
			resetState();
			close(true);
		} catch (err) {
			console.log(err);
			setIsButtonLoading(false);
		}
	}

	// Thumbnail e Banner: imagens obrigatórias
	function renderImageField(key, label) {
		return (
			<Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues[key] !== currentValues[key]}>
				{({ getFieldValue }) => (
					<div>
						<MediaField
							label={label}
							value={getFieldValue(key)}
							error={media.selectionError(key) || errors.errorOf(key, getFieldValue(key))}
							placeholder={t("Add multimedia")}
							onOpen={() => media.openMedia(key)}
							onRemove={() => media.setMediaValue(key, null)}
						/>
						<Form.Item name={key} hidden rules={[requiredRule, fileTypeRule("image", t)]}>
							<Input />
						</Form.Item>
					</div>
				)}
			</Form.Item>
		);
	}

	const filesError = errors.errorOf("items", items);

	return (
		<Drawer
			open={open}
			size={800}
			onClose={onClose}
			maskClosable={false}
			title={`${t("Add download")}`}
			extra={[
				<Button key="submit" type="primary" size="large" loading={isButtonLoading} onClick={errors.submit}>
					{t("Add")}
				</Button>,
			]}
		>
			<Media mediaKey={media.mediaKey} open={media.isOpenMedia} close={media.closeMedia} />
			<Form form={form} onFinish={handleSubmit} onFieldsChange={errors.onFieldsChange} layout="vertical">
				<Form.Item name="name" {...errors.labelErrorProps("name", name, "Nome")} rules={[requiredRule, nameRule()]}>
					<Input size="large" placeholder="Nome do download" />
				</Form.Item>
				<Form.Item name="country" label={t("Country")}>
					<Select
						mode="multiple"
						size="large"
						placeholder="País..."
						allowClear
						options={languages
							.filter((lang) => lang.id === selectedLanguage.id)
							.flatMap((l) =>
								JSON.parse(l.country).map((c) => ({
									value: c,
									label: t(`${c}`),
									id_lang: l.id,
								})),
							)
							.sort((a, b) => a.label.localeCompare(b.label))}
					/>
				</Form.Item>
				<div className="grid grid-cols-2 gap-4">
					{renderImageField("thumbnail", t("Thumbnail"))}
					{renderImageField("banner", t("Banner"))}
				</div>

				<p className="pb-2">
					<FieldLabel label={t("Files")} error={filesError} />
				</p>
				<p className="pb-3 text-[12px] text-gray-500">
					{t(
						"Note: a PowerPoint file (.pptx) can only be added if its PDF version, with exactly the same name (e.g. Presentation.pptx → Presentation.pdf), is uploaded to the Media library. That version is what the Preview shows in the app.",
					)}
				</p>
				<Form.List name="items" rules={[requiredListRule]}>
					{(fields, { add, remove }) => (
						<div className={`flex flex-col border border-dashed ${filesError ? "border-red-500" : "border-gray-300"} p-6`}>
							{fields.map((field) => (
								<div className={`py-4 border-bottom border-gray-300 flex flex-col justify-center`} key={field.key}>
									<Form.Item
										name={[field.name, "name"]}
										className="w-full"
										{...errors.labelErrorProps(["items", field.name, "name"], items?.[field.name]?.name, "Name")}
										rules={[requiredRule]}
									>
										<Input size="large" placeholder="Name" />
									</Form.Item>
									<Form.Item
										noStyle
										shouldUpdate={(prevValues, currentValues) =>
											JSON.stringify(prevValues.items) !== JSON.stringify(currentValues.items)
										}
									>
										{({ getFieldValue }) => {
											const path = ["items", field.name, "file"];
											const fileValue = getFieldValue(path);

											return (
												<>
													{/* o botão remove o item inteiro (nome + ficheiro), mesmo que ainda não tenha ficheiro */}
													<MediaField
														type="file"
														label={t("File")}
														value={fileValue}
														error={media.selectionError(path) || errors.errorOf(path, fileValue)}
														placeholder={t("Add file")}
														onOpen={() => media.openMedia("items", field.name, "file")}
														onRemove={() => remove(field.name)}
														alwaysRemovable
													/>
													<PowerPointPdfNote file={fileValue} />
													<Form.Item name={[field.name, "file"]} hidden rules={[requiredRule, powerPointPdfRule(t)]}>
														<Input />
													</Form.Item>
												</>
											);
										}}
									</Form.Item>

									<Form.Item name={[field.name, "id_lang"]} hidden defaultValue={selectedLanguage.id}>
										<Input />
									</Form.Item>
								</div>
							))}
							<Button size="large" onClick={() => add()}>
								{t("Add file")}
							</Button>
						</div>
					)}
				</Form.List>
			</Form>
		</Drawer>
	);
}
