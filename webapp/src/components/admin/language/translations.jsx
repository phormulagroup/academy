import { useContext, useEffect, useMemo, useState } from "react";
import ConfirmModal from "./../confirmModal";
import { toastRef } from "../../../utils/notify";
import RowActions from "../rowActions";
import { Button, Drawer, Empty, Form, Input, Pagination, Space, Table, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { LuLanguages, LuSearch } from "react-icons/lu";

import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import { requiredRule } from "../../../utils/formFieldError";

// Ordem alfabética das chaves, sem distinguir maiúsculas nem acentos
const byKey = (a, b) => (a.key ?? "").localeCompare(b.key ?? "", undefined, { sensitivity: "base", numeric: true });
// Para pesquisar sem acentos nem maiúsculas
const normalize = (s) => (s ?? "").toString().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Realça no texto o que foi pesquisado
function Highlight({ text, term }) {
  const value = text ?? "";
  const needle = normalize(term).trim();
  if (!needle) return <>{value}</>;
  // normalize() mantém o comprimento nos caracteres usados aqui; se mudar, mostra o texto sem realce
  const hay = normalize(value);
  if (hay.length !== value.length) return <>{value}</>;
  const parts = [];
  let from = 0;
  let at = hay.indexOf(needle, from);
  while (at !== -1) {
    if (at > from) parts.push(value.slice(from, at));
    parts.push(
      <mark key={at} className="rounded-sm bg-[#00B9D6]/25 px-0.5 text-inherit">
        {value.slice(at, at + needle.length)}
      </mark>,
    );
    from = at + needle.length;
    at = hay.indexOf(needle, from);
  }
  parts.push(value.slice(from));
  return <>{parts}</>;
}

export default function Translations({ data, defaultLanguage, open, close }) {
  const { update, getLanguages } = useContext(Context);
  const { t } = useTranslation();
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [form] = Form.useForm();

  const [translations, setTranslations] = useState([]);
  const [initial, setInitial] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingKey, setEditingKey] = useState("");
  const [deleteConfirmRecord, setDeleteConfirmRecord] = useState(null);
  const [newRowId, setNewRowId] = useState(null);

  useEffect(() => {
    if (open && data && defaultLanguage) {
      // Sem tradução própria, as chaves do idioma padrão servem de base
      const source = data.translation || defaultLanguage.translation;
      let loaded = [];
      try {
        loaded = (JSON.parse(source) || []).map((item, index) => ({ ...item, id: `${index}-${Date.now()}` }));
      } catch (err) {
        console.error("Erro ao analisar traduções:", err);
      }
      loaded.sort(byKey);

      setTranslations(loaded);
      setInitial(JSON.stringify(loaded.map(({ key, value }) => [key, value])));
      setSearch("");
      setCurrentPage(1);
      setEditingKey("");
      setNewRowId(null);
    }
  }, [open, data, defaultLanguage]);

  const isDirty = useMemo(() => JSON.stringify(translations.map(({ key, value }) => [key, value])) !== initial, [translations, initial]);

  // Lista visível: filtrada pela pesquisa, por ordem alfabética; a linha nova fica no topo enquanto se escreve
  const visible = useMemo(() => {
    const term = normalize(search).trim();
    const rows = translations.filter((r) => r.id === newRowId || !term || normalize(r.key).includes(term) || normalize(r.value).includes(term));
    const sorted = rows.filter((r) => r.id !== newRowId).sort(byKey);
    const fresh = rows.find((r) => r.id === newRowId);
    return fresh ? [fresh, ...sorted] : sorted;
  }, [translations, search, newRowId]);

  const pageRows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function onClose() {
    setEditingKey("");
    setNewRowId(null);
    close();
  }

  const isEditing = (record) => record.id === editingKey;

  const edit = (record) => {
    form.setFieldsValue({ key: record.key, value: record.value });
    setEditingKey(record.id);
  };

  const cancel = () => {
    // Cancelar uma linha nova remove-a
    if (editingKey === newRowId) {
      setTranslations(translations.filter((item) => item.id !== editingKey));
      setNewRowId(null);
    }
    setEditingKey("");
  };

  const save = async (id) => {
    try {
      const row = await form.validateFields();
      const newData = translations.map((item) => (item.id === id ? { ...item, ...row } : item));
      setTranslations(newData);
      setEditingKey("");
      if (id === newRowId) setNewRowId(null);
      return newData;
    } catch (errInfo) {
      console.log("Validação Falhou:", errInfo);
      return null;
    }
  };

  const addRow = () => {
    if (editingKey) return toastRef.current.error(t("Save or cancel the row you are editing first"));
    const newId = `${translations.length}-${Date.now()}`;
    // A pesquisa limpa-se para a linha nova não ficar escondida
    setSearch("");
    setTranslations([{ id: newId, key: "", value: "" }, ...translations]);
    setCurrentPage(1);
    setEditingKey(newId);
    setNewRowId(newId);
    form.setFieldsValue({ key: "", value: "" });
  };

  const handleDeleteConfirm = () => {
    const id = deleteConfirmRecord.id;
    setTranslations(translations.filter((item) => item.id !== id));
    if (id === newRowId) setNewRowId(null);
    setDeleteConfirmRecord(null);
  };

  async function saveTranslationsToDatabase(rows) {
    try {
      for (const trans of rows) {
        if (!trans.key || !trans.value) {
          toastRef.current.error(t("All rows must have a Key and Translation value"));
          return false;
        }
      }
      if (rows.length === 0) {
        toastRef.current.error(t("At least one translation is required"));
        return false;
      }

      const toSave = [...rows].sort(byKey).map(({ id: _unused, ...rest }) => rest);
      const countryData = typeof data.country === "string" ? JSON.parse(data.country) : data.country;

      await update({ data: { id: data.id, country: countryData, translation: JSON.stringify(toSave) }, table: "language" });

      try {
        await getLanguages();
      } catch (err) {
        console.error("Erro ao atualizar idiomas:", err);
      }
      return true;
    } catch (err) {
      console.error("Erro ao salvar traduções:", err);
      toastRef.current.error(t("Error saving translations"));
      return false;
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
      if (!(await saveTranslationsToDatabase(rows))) return;
      // Aguardar antes de fechar para que o utilizador veja a mensagem de sucesso
      await new Promise((resolve) => setTimeout(resolve, 800));
      setEditingKey("");
      close(true);
    } finally {
      setIsButtonLoading(false);
    }
  }

  const columns = [
    {
      title: t("Key"),
      dataIndex: "key",
      key: "key",
      width: "40%",
      render: (text, record) =>
        isEditing(record) ? (
          <Form.Item name="key" rules={[requiredRule]} style={{ margin: 0 }}>
            <Input.TextArea placeholder={t("Translation key")} autoSize={{ minRows: 2, maxRows: 6 }} />
          </Form.Item>
        ) : (
          <span className="break-words text-[13px] text-[#5B5F6B]">
            <Highlight text={text} term={search} />
          </span>
        ),
    },
    {
      title: data?.name || t("Translation"),
      dataIndex: "value",
      key: "value",
      width: "50%",
      render: (text, record) =>
        isEditing(record) ? (
          <Form.Item name="value" rules={[requiredRule]} style={{ margin: 0 }}>
            <Input.TextArea placeholder={t("Translation value")} autoSize={{ minRows: 2, maxRows: 6 }} />
          </Form.Item>
        ) : (
          <span className="break-words text-[14px]">
            <Highlight text={text} term={search} />
          </span>
        ),
    },
    {
      title: t("Actions"),
      key: "actions",
      width: "10%",
      render: (_, record) => {
        if (isEditing(record)) {
          return (
            <Space size="small">
              <Button type="primary" size="small" onClick={() => save(record.id)}>
                {t("Save")}
              </Button>
              <Button size="small" onClick={cancel}>
                {t("Cancel")}
              </Button>
            </Space>
          );
        }
        return (
          <RowActions
            items={[
              { label: t("Update"), key: `${record.id}-edit`, icon: <FaRegEdit />, onClick: () => edit(record) },
              { label: t("Delete"), key: `${record.id}-delete`, icon: <FaRegTrashAlt />, onClick: () => setDeleteConfirmRecord(record) },
            ]}
          />
        );
      },
    },
  ];

  return (
    <Drawer
      open={open}
      size={1000}
      onClose={onClose}
      maskClosable={false}
      title={
        <span className="flex items-center gap-2">
          <LuLanguages className="text-[#163986]" />
          {t("Translations")} - {data?.name || t("Language")}
        </span>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-[#8A8D98]">{isDirty ? <Tag color="orange">{t("Unsaved changes")}</Tag> : t("No changes")}</span>
          <div className="flex gap-2">
            <Button onClick={onClose}>{t("Cancel")}</Button>
            <Button type="primary" loading={isButtonLoading} disabled={!isDirty && !editingKey} onClick={submit}>
              {t("Save All Translations")}
            </Button>
          </div>
        </div>
      }>
      {data && defaultLanguage ? (
        <Form form={form} layout="vertical">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Input
              allowClear
              size="large"
              className="min-w-60 flex-1"
              prefix={<LuSearch className="text-[#8A8D98]" />}
              placeholder={t("Search by key or translation...")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={addRow}>
              {t("Add Translation")}
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={pageRows}
            rowKey="id"
            pagination={false}
            size="small"
            className="mb-4"
            scroll={{ x: true }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={search ? t("No translations match your search") : t("No translations yet")} /> }}
          />

          {visible.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] text-[#5B5F6B]">
                {search ? `${visible.length} ${t("of")} ${translations.length}` : `${t("Total records")}: ${translations.length}`}
              </span>
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={visible.length}
                onChange={(page, size) => {
                  setCurrentPage(page);
                  if (size !== pageSize) setPageSize(size);
                  cancel(); // Cancelar edição ao mudar de página
                }}
                onShowSizeChange={(_current, size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                  cancel();
                }}
                showSizeChanger
                showTotal={(total, range) => `${range[0]}-${range[1]} ${t("of")} ${total}`}
              />
            </div>
          )}

          <ConfirmModal
            open={!!deleteConfirmRecord}
            tone="danger"
            title={t("Delete Translation")}
            description={t("Are you sure you want to delete this translation?")}
            okText={t("Delete")}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteConfirmRecord(null)}
          />
        </Form>
      ) : (
        <p>{t("Loading...")}</p>
      )}
    </Drawer>
  );
}
