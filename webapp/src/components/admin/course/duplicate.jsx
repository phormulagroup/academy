import { useContext, useEffect, useState } from "react";
import { toastRef } from "../../../utils/notify";
import {
	Button,
	Modal,
	Form,
	Input,
	Select,
	notification,
} from "antd";
import axios from "axios";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import { FaRegEdit } from "react-icons/fa";
import i18n from "../../../utils/i18n";
import { useNavigate } from "react-router-dom";
import { requiredRule } from "../../../utils/formFieldError";

export default function Duplicate({ data, open, close, submit, products, nameRule, internalNameRule }) {
	const { t, selectedLanguage, languages, setSelectedLanguage } = useContext(Context);
	const [isButtonLoading, setIsButtonLoading] = useState(false);
	const [formLanguageId, setFormLanguageId] = useState(null);

	const [form] = Form.useForm();

	const navigate = useNavigate();

	// Define idioma padrão para o idioma atualmente selecionado e rastrear alterações
	useEffect(() => {
		if (open && selectedLanguage?.id) {
			form.setFieldValue('id_lang', selectedLanguage.id);
			setFormLanguageId(selectedLanguage.id);
			// Define valores padrão para nome e nome_interno com (cópia)
			form.setFieldValue('name', data.name + " (copy)");
			form.setFieldValue('internal_name', data.internal_name + " (copy)");
		}
	}, [selectedLanguage, open, form, data]);

	function onClose() {
		form.resetFields();
		close();
	}

	async function submit(values) {
		setIsButtonLoading(true);
		try {
			const res = await axios.post(endpoints.course.duplicate, {
				data: { 
					id_lang: values.id_lang, 
					id: data.id,
					new_name: values.name,
					new_internal_name: values.internal_name,
				},
			});
			console.log("Duplicate response:", res.data);
			if (!res.data.insertId) {
				throw new Error(t("No insertId returned from duplicate endpoint"));
			}

			// Obter o nome do idioma para notificação
			const duplicatedLanguage = languages.find(l => l.id === values.id_lang);
			const languageName = duplicatedLanguage?.code.toUpperCase() || t("Unknown");

			// Mostrar notificação de sucesso com botão Detalhes
			notification.success({
				message: t("Course duplicated successfully"),
				description: `"${data.internal_name}" ${t("was duplicated with success for the language")} ${languageName}`,
				duration: 8, // 8 segundos para permitir que o utilizador clique no botão Detalhes
				btn: (
					<Button 
						type="primary" 
						size="small" 
						icon={<FaRegEdit />}
						onClick={() => {
							// Se estiver duplicando para um idioma diferente, mude o idioma do Header quando clicar em Detalhes
							if (values.id_lang !== selectedLanguage.id) {
								const selectedLang = languages.find(l => l.id === values.id_lang);
								if (selectedLang) {
									setSelectedLanguage(selectedLang);
									localStorage.setItem('id_lang', selectedLang.id);
									i18n.changeLanguage(selectedLang.code);
								}
							}
							navigate(`/admin/courses/${res.data.insertId}`);
							notification.destroy();
						}}
					>
						{t("See Details")}
					</Button>
				),
			});

			// Fechar o modal de duplicação do curso
			close(true);
			setIsButtonLoading(false);
		} catch (err) {
			console.log("Duplicate error:", err);
			toastRef.current.error(err.message || t("Error duplicating course"));
			setIsButtonLoading(false);
		}
	}



	// Lidar com a mudança de idioma no formulário - atualizar formLanguageId para validação
	const handleLanguageChange = (langId) => {
		setFormLanguageId(langId);
		// Acionar revalidação do nome e do nome interno quando o idioma muda
		form.validateFields(["name", "internal_name"]);
	};

	// Os nomes são únicos no idioma escolhido no formulário
	const targetLanguageId = formLanguageId || selectedLanguage.id;

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
      <p className="text-[16px] font-bold mb-4 font-ryker">{t("Duplicate Course")}</p>
      <p>{t("Are you sure you want to duplicate this course?")}</p>
      <p className="mb-4">
        {t("Selected course")}: <b>{data.internal_name}</b>
      </p>
      <Form
        form={form}
        onFinish={submit}
        layout="vertical"
      >
        <Form.Item
          name="name"
          label={t("New name")}
          rules={[requiredRule, nameRule(null, targetLanguageId)]}
        >
          <Input 
            size="large" 
            placeholder={`${data.name} (copy)`}
          />
        </Form.Item>
        <Form.Item
          name="internal_name"
          label={t("New internal name")}
          rules={[requiredRule, internalNameRule(null, targetLanguageId)]}
        >
          <Input 
            size="large" 
            placeholder={`${data.internal_name} (copy)`}
          />
        </Form.Item>
        <Form.Item
          name="id_lang"
          label={t("New language")}
        >
          <Select
            size="large"
            className="w-full"
            placeholder={t("Select...")}
            onChange={handleLanguageChange}
            showSearch={{
              optionFilterProp: ["label"],
            }}
            options={languages.map((item) => ({
              label: (
                <div className={`flex items-center`}>
                  <img
                    src={item.flag}
                    className="max-w-5 mr-2"
                    alt={item.name}
                  />
                  <p>{item.name}</p>
                </div>
              ),
              value: item.id,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
