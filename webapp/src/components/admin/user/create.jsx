import { useContext, useEffect, useRef, useState } from "react";
import {
	Button,
	Drawer,
	Form,
	Input,
	Select,
	Divider,
	Switch,
	DatePicker,
} from "antd";
import { AiOutlinePlus } from "react-icons/ai";

import { Context } from "../../../utils/context";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import axios from "axios";
import endpoints from "../../../utils/endpoints";
import validator from "validator";

export default function Create({ open, close, submit }) {
	const { create, roles, languages, selectedLanguage } = useContext(Context);
	const [isButtonLoading, setIsButtonLoading] = useState(false);

	const inputRef = useRef(null);

	const [form] = Form.useForm();
	const [formClient] = Form.useForm();

	const { t } = useTranslation();

	function onClose() {
		form.resetFields();
		close();
	}

	async function submit(values) {
		setIsButtonLoading(true);
		try {
			await create({ data: values, table: "user" });
			setIsButtonLoading(false);
			close(true);
		} catch (err) {
			console.log(err);
			setIsButtonLoading(false);
		}
	}

	function validateUser(email) {
		return new Promise((resolve, reject) => {
			axios
				.get(endpoints.user.readByEmail, { params: { email } })
				.then((res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		});
	}

	return (
		<Drawer
			open={open}
			size={800}
			onClose={onClose}
			maskClosable={false}
			title="Adicionar utilizador"
			extra={[
				<Button size="large" loading={isButtonLoading} onClick={form.submit}>
					Adicionar
				</Button>,
			]}
		>
			<Form
				form={form}
				onFinish={submit}
				layout="vertical"
				validateMessages={{
					required: "Este campo é obrigatório!",
				}}
			>
				<Form.Item
					name="email"
					label="E-mail"
					validateDebounce={1000}
					rules={[
						{
							required: true,
							validator: async (_, value) => {
								if (value) {
									if (validator.isEmail(value)) {
										const obj = await validateUser(value);
										console.log(obj);
										if (obj.length === 0) {
											return Promise.resolve();
										} else {
											return Promise.reject(
												t(
													"This e-mail is already associated with another account",
												),
											);
										}
									} else {
										return Promise.reject(t("The e-mail must be valid"));
									}
								} else {
									return Promise.resolve();
								}
							},
						},
					]}
					hasFeedback
				>
					<Input
						type="email"
						placeholder="nome@phormulagroup.com"
						size="large"
					/>
				</Form.Item>
				<div className="grid grid-cols-2 gap-x-4">
					<Form.Item name="name" label="Nome" rules={[{ required: true }]}>
						<Input placeholder="John Doe" size="large" />
					</Form.Item>
					<Form.Item
						name="id_country"
						label="País"
						rules={[{ required: true }]}
					>
						<Select
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
					<Form.Item
						label={t("Academic background")}
						name="academic_background"
						rules={[{ required: true }]}
					>
						<Select
							size="large"
							placeholder={t("Academic background")}
							showSearch={{ optionFilterProp: "label" }}
							allowClear
							options={[
								{
									label: t("Secondary School"),
									value: "Secondary School",
								},
								{
									label: t("University Degree"),
									value: "University Degree",
								},
								{ label: t("PhD"), value: "PhD" },
							]}
						/>
					</Form.Item>
					<Form.Item
						label={t("Bial's starting date")}
						name="bial_starting_date"
						rules={[{ required: true }]}
						getValueProps={(value) => ({
							value: value && dayjs(value),
						})}
					>
						<DatePicker
							size="large"
							placeholder={t("Select Bial's starting date")}
							className="w-full"
						/>
					</Form.Item>
					<Form.Item
						label={t("Birth date")}
						name="birth_date"
						rules={[{ required: true }]}
						getValueProps={(value) => ({
							value: value && dayjs(value),
						})}
					>
						<DatePicker
							size="large"
							placeholder={t("Select birth date")}
							className="w-full"
						/>
					</Form.Item>
					<Form.Item name="id_role" label="Role" rules={[{ required: true }]}>
						<Select
							size="large"
							placeholder="Role..."
							allowClear
							options={roles.map((item) => ({
								label: item.name,
								value: item.id,
							}))}
						/>
					</Form.Item>
				</div>
			</Form>
		</Drawer>
	);
}
