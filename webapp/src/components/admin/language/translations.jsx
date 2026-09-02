import { useContext, useEffect, useState } from "react";
import { Button, Drawer, Input, Form, Table, Space, Popconfirm, Pagination, message, Dropdown } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { IoMdMore } from "react-icons/io";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";

import { Context } from "../../../utils/context";

export default function Translations({ data, defaultLanguage, open, close }) {
  const { update, getLanguages } = useContext(Context);
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
      
      // Validar que key e value não estão vazios
      if (!row.key || !row.key.trim()) {
        message.error("Key is required");
        return;
      }
      if (!row.value || !row.value.trim()) {
        message.error("Translation value is required");
        return;
      }

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
    } catch (errInfo) {
      console.log("Validação Falhou:", errInfo);
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
          message.error("All rows must have a Key and Translation value");
          return;
        }
      }

      if (translationsToUpdate.length === 0) {
        message.error("At least one translation is required");
        return;
      }

      // Remover o campo id antes de salvar
      const translationsToSave = translationsToUpdate.map((trans) => {
        const { id: _unused, ...rest } = trans;
        return rest;
      });

      const countryData =
        typeof data.country === "string" ? JSON.parse(data.country) : data.country;

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
      message.error("Erro ao salvar traduções");
    }
  }

  async function submit() {
    setIsButtonLoading(true);
    try {
      await saveTranslationsToDatabase(translations);
      
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
      title: "Key",
      dataIndex: "key",
      key: "key",
      width: "40%",
      editable: true,
      render: (text, record) => {
        const isEdited = isEditing(record);
        return isEdited ? (
          <Form.Item name="key" rules={[{ required: true, message: "Key is required" }]} style={{ margin: 0 }}>
            <Input.TextArea placeholder="Translation key" rows={2} />
          </Form.Item>
        ) : (
          <span>{text}</span>
        );
      },
    },
    {
      title: `${data?.name || "Translation"}`,
      dataIndex: "value",
      key: "value",
      width: "50%",
      editable: true,
      render: (text, record) => {
        const isEdited = isEditing(record);
        return isEdited ? (
          <Form.Item name="value" rules={[{ required: true, message: "Translation value is required" }]} style={{ margin: 0 }}>
            <Input.TextArea placeholder="Translation value" rows={2} />
          </Form.Item>
        ) : (
          <span>{text}</span>
        );
      },
    },
    {
      title: "Ações",
      key: "actions",
      width: "10%",
      render: (_, record) => {
        const isEdited = isEditing(record);
        
        if (isEdited) {
          return (
            <Space size="small">
              <Button type="primary" size="small" onClick={() => save(record.id)}>
                Save
              </Button>
              <Button size="small" onClick={cancel}>
                Cancel
              </Button>
            </Space>
          );
        }

        const items = [
          {
            label: "Update",
            key: `${record.id}-edit`,
            icon: <FaRegEdit />,
            onClick: () => edit(record),
          },
          {
            label: "Delete",
            key: `${record.id}-delete`,
            icon: <FaRegTrashAlt />,
            onClick: () => setDeleteConfirmRecord(record),
          },
        ];

        return (
          <Dropdown menu={{ items }} placement="bottomRight">
            <Button type="text" size="small">
              <IoMdMore />
            </Button>
          </Dropdown>
        );
      },
    }
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
      title={`Traduções - ${data?.name || "Language"}`}
      extra={[]}
    >
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
                  Total de registos: <strong>{translations.length}</strong>
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
                  showTotal={(total, range) => `${range[0]}-${range[1]} de ${total}`}
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
                block
              >
                Add Translation
              </Button>
            </div>

            {/* Botão Guardar */}
            <div className="flex justify-end gap-2">
              <Button onClick={onClose}>Cancel</Button>
              <Button
                type="primary"
                loading={isButtonLoading}
                onClick={submit}
                size="large"
              >
                Save All Translations
              </Button>
            </div>
          </Form>

          {/* Modal de Confirmação de Deleção */}
          {deleteConfirmRecord && (
            <Popconfirm
              title="Delete Translation"
              description="Are you sure you want to delete this translation?"
              open={!!deleteConfirmRecord}
              okText="Yes"
              cancelText="No"
              onConfirm={handleDeleteConfirm}
              onCancel={() => setDeleteConfirmRecord(null)}
            />
          )}
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </Drawer>
  );
}
