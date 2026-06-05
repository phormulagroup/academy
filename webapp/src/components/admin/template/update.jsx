import { useContext, useEffect, useRef, useState } from "react";
import {
	Button,
	Drawer,
	Form,
	Input,
	Select,
	Divider,
	Switch,
	Modal,
} from "antd";

import { useTranslation } from "react-i18next";
import axios from "axios";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";

export default function Update({ data, open, close }) {
	const { createLog, selectedLanguage, user, update } = useContext(Context);
	const [isButtonLoading, setIsButtonLoading] = useState(false);

	const [form] = Form.useForm();

	const { t } = useTranslation();

	useEffect(() => {
		if (data) {
			form.setFieldsValue({ ...data });
		}
	}, [open === true]);

	function onClose() {
		close();
	}

	async function submit(values) {
		setIsButtonLoading(true);
		try {
			const res = await update({ table: "email", data: values });

			setIsButtonLoading(false);
			close(true);
		} catch (err) {
			console.log(err);
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
				<Button disabled={isButtonLoading} onClick={onClose}>
					{t("Cancel")}
				</Button>,
				<Button loading={isButtonLoading} type="primary" onClick={form.submit}>
					{t("Save")}
				</Button>,
			]}
		>
			<div className="p-2 pb-0">
				<p className="text-[16px] font-bold">{t("Update template")}</p>
				<div className="flex flex-col">
					<Form
						form={form}
						onFinish={submit}
						layout="vertical"
						className="mt-6!"
					>
						<Form.Item name="id" hidden>
							<Input size="large" />
						</Form.Item>
						<Form.Item name="name" label={t("Name")}>
							<Input size="large" />
						</Form.Item>
					</Form>
				</div>
			</div>
		</Modal>
	);
}
