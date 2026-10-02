import { useContext, useEffect, useState } from "react";
import ConfirmModal from "./../confirmModal";
import { toastRef } from "../../../utils/notify";
import RowActions from "../rowActions";
import {
  Button,
  Drawer,
  Input,
  Form,
  Table,
  Space,
  Pagination,
  } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";

import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import { requiredRule } from "../../../utils/formFieldError";

export default function Translations({ data, defaultLanguage, open, close }) {
  const { update, getLanguages } = useContext(Context);
  const { t } = useTranslation();
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [form] = Form.useForm();

  const [translations, setTranslations] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingKey, setEditingKey] = useState("");
  const [deleteConfirmRecord, setDeleteConfirmRecord] = useState(null);
  const [newRowId, setNewRowId] = useState(null);

  useEffect(() => {
    if (open && data && defaultLanguage) {
      // Carregar dados de traduções
      const aux = Object.assign([], data);
      let loadedTranslations = [];

      if (!aux.translation) {
        // Se sem tradução, usar chaves do idioma padrão como base
        if (defaultLanguage.translation) {
          try {
            const defaultTrans = JSON.parse(defaultLanguage.translation);
            loadedTranslations = defaultTrans.map((item, index) => ({
              ...item,
              id: `${index}-${Date.now()}`, // ID único para cada linha
            }));
          } catch (err) {
            console.error("Erro ao analisar traduções do idioma padrão:", err);
          }
        }
      } else {
        try {
          const parsedTranslations = JSON.parse(aux.translation) || [];
          loadedTranslations = parsedTranslations.map((item, index) => ({
            ...item,
            id: `${index}-${Date.now()}`, // ID único para cada linha
          }));
        } catch (err) {
          console.error("Erro ao analisar traduções do idioma:", err);
        }
      }

      setTranslations(loadedTranslations);
      setCurrentPage(1);
      setEditingKey("");
      setNewRowId(null);
    }
  }, [open, data, defaultLanguage]);

  function onClose() {
    setEditingKey("");
    setNewRowId(null);
    close();
  }

  const isEditing = (record) => record.id === editingKey;

  const edit = (record) => {
    form.setFieldsValue({
      key: record.key,
      value: record.value,
    });
    setEditingKey(record.id);
  };

  const cancel = () => {
    // Se cancelar uma linha nova, removê-la
    if (editingKey === newRowId) {
      const newData = translations.filter((item) => item.id !== editingKey);
      setTranslations(newData);
      setNewRowId(null);
    }
    setEditingKey("");
  };

  const save = async (id) => {
    try {
      const row = await form.validateFields();

      const newData = [...translations];
      const index = newData.findIndex((item) => id === item.id);

      if (index > -1) {
        const item = newData[index];
        newData.splice(index, 1, { ...item, ...row });
        setTranslations(newData);
        setEditingKey("");
        if (id === newRowId) {
          setNewRowId(null);
        }
      }
      return newData;
    } catch (errInfo) {
      console.log("Validação Falhou:", errInfo);
      return null;
    }
  };

  const addRow = () => {
    const newId = `${translations.length}-${Date.now()}`;
    const newTranslation = {
      id: newId,
      key: "",
      value: "",
    };
    // Adicionar nova linha no início para ser visível na primeira página
    setTranslations([newTranslation, ...translations]);
    // Definir para primeira página e editar automaticamente a nova linha
    setCurrentPage(1);
    setEditingKey(newId);
    setNewRowId(newId);
    form.setFieldsValue({ key: "", value: "" });
  };

  const deleteRow = (id) => {
    const newData = translations.filter((item) => item.id !== id);
    setTranslations(newData);
    if (id === newRowId) {
      setNewRowId(null);
    }
  };

  const handleDeleteConfirm = () => {
    deleteRow(deleteConfirmRecord.id);
    setDeleteConfirmRecord(null);
  };

  async function saveTranslationsToDatabase(translationsToUpdate) {
    try {
      // Validar que todas as linhas tém key e value
      for (const trans of translationsToUpdate) {
        if (!trans.key || !trans.value) {
          toastRef.current.error(t("All rows must have a Key and Translation value"));
          return;
        }
      }

      if (translationsToUpdate.length === 0) {
        toastRef.current.error(t("At least one translation is required"));
        return;
      }

      // Remover o campo id antes de salvar
      const translationsToSave = translationsToUpdate.map((trans) => {
        const { id: _unused, ...rest } = trans;
        return rest;
      });

      const countryData =
        typeof data.country === "string"
          ? JSON.parse(data.country)
          : data.country;

      // Atualizar na base de dados
      await update({
        data: {
          id: data.id,
          country: countryData,
          translation: JSON.stringify(translationsToSave),
        },
        table: "language",
      });

      // Atualizar cache global de idiomas
      try {
        await getLanguages();
      } catch (err) {
        console.error("Erro ao atualizar idiomas:", err);
      }
    } catch (err) {
      console.error("Erro ao salvar traduções:", err);
      toastRef.current.error(t("Error saving translations"));
    }
  }

  async function submit() {
    // Uma linha ainda em edição é validada e guardada antes de gravar tudo
    let rows = translations;
    if (editingKey) {
      rows = await save(editingKey);
      if (!rows) return;
    }

    setIsButtonLoading(true);
    try {
      await saveTranslationsToDatabase(rows);

      // Aguardar antes de fechar para que o utilizador veja a mensagem de sucesso
      await new Promise((resolve) => setTimeout(resolve, 800));

      setEditingKey("");
      close(true);
    } finally {
      setIsButtonLoading(false);
    }
  }

  // Configuração das colunas da tabela
  const columns = [
    {
      title: t("Key"),
      dataIndex: "key",
      key: "key",
      width: "40%",
      editable: true,
      render: (text, record) => {
        const isEdited = isEditing(record);
        return isEdited ? (
          <Form.Item name="key" rules={[requiredRule]} style={{ margin: 0 }}>
            <Input.TextArea placeholder={t("Translation key")} rows={2} />
          </Form.Item>
        ) : (
          <span>{text}</span>
        );
      },
    },
    {
      title: `${data?.name || t("Translation")}`,
      dataIndex: "value",
      key: "value",
      width: "50%",
      editable: true,
      render: (text, record) => {
        const isEdited = isEditing(record);
        return isEdited ? (
          <Form.Item name="value" rules={[requiredRule]} style={{ margin: 0 }}>
            <Input.TextArea placeholder={t("Translation value")} rows={2} />
          </Form.Item>
        ) : (
          <span>{text}</span>
        );
      },
    },
    {
      title: t("Actions"),
      key: "actions",
      width: "10%",
      render: (_, record) => {
        const isEdited = isEditing(record);

        if (isEdited) {
          return (
            <Space size="small">
              <Button
                type="primary"
                size="small"
                onClick={() => save(record.id)}>
                {t("Save")}
              </Button>
              <Button size="small" onClick={cancel}>
                {t("Cancel")}
              </Button>
            </Space>
          );
        }

        const items = [
          {
            label: t("Update"),
            key: `${record.id}-edit`,
            icon: <FaRegEdit />,
            onClick: () => edit(record),
          },
          {
            label: t("Delete"),
            key: `${record.id}-delete`,
            icon: <FaRegTrashAlt />,
            onClick: () => setDeleteConfirmRecord(record),
          },
        ];

        return (
          <RowActions items={items} />
        );
      },
    },
  ];

  // Páginação
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTranslations = translations.slice(startIndex, endIndex);

  return (
    <Drawer
      open={open}
      size={1000}
      onClose={onClose}
      maskClosable={false}
      title={`${t("Translations")} - ${data?.name || t("Language")}`}
      extra={[]}>
      {data && defaultLanguage ? (
        <div>
          <Form form={form} layout="vertical">
            {/* Tabela com edição inline */}
            <Table
              columns={columns}
              dataSource={paginatedTranslations}
              rowKey="id"
              pagination={false}
              size="small"
              bordered
              className="mb-4"
              scroll={{ x: true }}
            />

            {/* Controles de Páginação */}
            {translations.length > 0 && (
              <div className="flex justify-between items-center mb-4">
                <span>
                  {t("Total records")}: <strong>{translations.length}</strong>
                </span>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={translations.length}
                  onChange={(page) => {
                    setCurrentPage(page);
                    setEditingKey(""); // Cancelar edição ao mudar de página
                  }}
                  onShowSizeChange={(current, size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                    setEditingKey(""); // Cancelar edição ao mudar tamanho da página
                  }}
                  showSizeChanger
                  showTotal={(total, range) =>
                    `${range[0]}-${range[1]} ${t("of")} ${total}`
                  }
                />
              </div>
            )}

            {/* Botão Adicionar Nova Linha */}
            <div className="mb-4 flex gap-2">
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addRow}
                size="large"
                block>
                {t("Add Translation")}
              </Button>
            </div>

            {/* Botão Guardar */}
            <div className="flex justify-end gap-2">
              <Button onClick={onClose}>{t("Cancel")}</Button>
              <Button
                type="primary"
                loading={isButtonLoading}
                onClick={submit}
                size="large">
                {t("Save All Translations")}
              </Button>
            </div>
          </Form>

          {/* Modal de Confirmação de Deleção */}
          <ConfirmModal
            open={!!deleteConfirmRecord}
            tone="danger"
            title={t("Delete Translation")}
            description={t("Are you sure you want to delete this translation?")}
            okText={t("Delete")}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteConfirmRecord(null)}
          />
        </div>
      ) : (
        <p>{t("Loading...")}</p>
      )}
    </Drawer>
  );
}
