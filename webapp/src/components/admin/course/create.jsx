import { useContext, useState } from "react";
import {
	Button,
	Modal,
	Form,
	Input,
	Select,
	message,
} from "antd";

import { Context } from "../../../utils/context";
import { useNavigate } from "react-router-dom";
import { requiredRule } from "../../../utils/formFieldError";

export default function Create({ open, close, products, nameRule, internalNameRule }) {
	const { create, t, selectedLanguage } = useContext(Context);
	const [isButtonLoading, setIsButtonLoading] = useState(false);

	const [form] = Form.useForm();

	const navigate = useNavigate();

	function onClose() {
		form.resetFields();
		close();
	}

	async function submit(values) {
		setIsButtonLoading(true);
		try {
			const res = await create({
				data: { ...values, id_lang: selectedLanguage.id },
				table: "course",
			});

			// Delay na navegação para permitir que a mensagem seja exibida antes de redirecionar
			setTimeout(() => {
				navigate(`/admin/courses/${res.data.insertId}`);
				onClose();
			}, 1500);
		} catch (err) {
			console.log(err);
			message.error(err.response?.data?.message || t("Error creating course"));
			setIsButtonLoading(false);
		}
	}



	return (
		<Modal
			key="modal-logout"
			width={500}
			style={{ top: 20 }}
			onCancel={onClose}
			open={open}
			maskClosable={false}
			footer={[
				<Button onClick={onClose}>{t("Cancel")}</Button>,
				<Button type="primary" loading={isButtonLoading} onClick={form.submit}>
					{t("Create")}
				</Button>,
			]}
		>
			<p className="text-[16px] font-bold mb-4">{t("Create Course")}</p>
			<Form
				form={form}
				onFinish={submit}
				layout="vertical"
			>
				<Form.Item name="name" label={t("Name")} rules={[requiredRule, nameRule()]}>
					<Input size="large" placeholder={t("Enter course name")} />
				</Form.Item>
				<Form.Item
					name="internal_name"
					label={t("Internal name")}
					rules={[requiredRule, internalNameRule()]}
				>
					<Input size="large" placeholder={t("Enter internal course name")} />
				</Form.Item>
				<Form.Item name="id_product" label={t("Product")}>
					<Select
						size="large"
						className="w-full"
						placeholder="Selecione..."
						showSearch={{
							optionFilterProp: ["label"],
						}}
						options={products.filter((p) => p.is_deleted === 0).map((p) => ({ label: p.name, value: p.id }))}
					/>
				</Form.Item>
				<Form.Item
					name="status"
					label={t("Status")}
				>
					<Select
						size="large"
						className="w-full"
						placeholder="Selecione..."
						showSearch={{
							optionFilterProp: ["label"],
						}}
						defaultValue={"draft"}
						options={[
							{
								label: "Draft",
								value: "draft",
							},
							{
								label: "Published",
								value: "published",
							},
						]}
					/>
				</Form.Item>
			</Form>
		</Modal>
	);
}
