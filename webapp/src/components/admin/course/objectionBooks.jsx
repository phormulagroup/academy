import { useState } from "react";
import { Button, Collapse, Form, Input, Tag, Tooltip } from "antd";
import { LuBookOpen, LuChevronDown, LuChevronUp, LuMessageSquareWarning, LuTrash2 } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { requiredRule } from "../../../utils/formFieldError";
import AddTile from "../../../utils/addTile";
import { useConfirm } from "../confirmModal";
import RichTextFormField from "../richText/richTextFormField";

// Título de uma objeção no cabeçalho do painel, a acompanhar o que se escreve no campo
function ObjectionTitle({ form, path, index }) {
  const { t } = useTranslation();
  const title = Form.useWatch(path, form);
  return (
    <span className="flex items-center gap-2 min-w-0">
      <span className="shrink-0 text-[12px] text-[#8A8D98]">{index}.</span>
      <span className={`truncate font-semibold ${title ? "" : "text-[#8A8D98] font-normal italic"}`}>{title || t("Untitled objection")}</span>
    </span>
  );
}

// Livro de objeções do curso: cada livro (separador no frontoffice) agrupa objeções com título e texto.
// Guarda em objection.tabs = [{ label, items: [{ title, text }] }], o mesmo formato de sempre.
export default function ObjectionBooks({ form }) {
  const { t } = useTranslation();
  const [confirm, confirmHolder] = useConfirm();
  // Objeções abertas, por "livro-objeção"; as novas abrem logo para escrever
  const [open, setOpen] = useState([]);
  const toggle = (bookKey, keys) => setOpen((prev) => [...prev.filter((k) => !k.startsWith(`${bookKey}:`)), ...keys.map((k) => `${bookKey}:${k}`)]);

  const openKeys = (bookKey) => open.filter((k) => k.startsWith(`${bookKey}:`)).map((k) => k.slice(String(bookKey).length + 1));

  return (
    <>
      {confirmHolder}
      <Form.List name={["objection", "tabs"]}>
        {(books, { add, remove, move }) => (
          <div className="flex flex-col gap-4">
            {books.length === 0 && (
              <p className="mb-0! rounded-xl bg-[#FAFAFB] px-4 py-3 text-[13px] text-[#8A8D98]">
                {t("Group the objections by theme. Each book appears as a tab in the course page")}
              </p>
            )}

            {books.map((book, bookIndex) => (
              <div key={book.key} className="rounded-xl border border-solid border-[#E5E7EB] bg-white">
                {/* Cabeçalho do livro: número, nome, contagem e ações */}
                <div className="flex flex-wrap items-center gap-3 border-0 border-b border-solid border-[#F0F0F0] px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6F9FC] text-[#163986]">
                    <LuBookOpen />
                  </span>
                  <Form.Item name={[book.name, "label"]} className="mb-0! min-w-48 flex-1" rules={[requiredRule]}>
                    <Input size="large" placeholder={t("Name of the book (shown as a tab)")} />
                  </Form.Item>
                  <Form.Item noStyle shouldUpdate>
                    {() => {
                      const count = (form.getFieldValue(["objection", "tabs", book.name, "items"]) || []).length;
                      return (
                        <Tag className="m-0!" color={count ? "blue" : "default"}>
                          {t("Objections: {{count}}", { count })}
                        </Tag>
                      );
                    }}
                  </Form.Item>
                  <div className="flex items-center gap-1">
                    <Tooltip title={t("Move up")}>
                      <Button type="text" disabled={bookIndex === 0} icon={<LuChevronUp />} aria-label={t("Move up")} onClick={() => move(bookIndex, bookIndex - 1)} />
                    </Tooltip>
                    <Tooltip title={t("Move down")}>
                      <Button type="text" disabled={bookIndex === books.length - 1} icon={<LuChevronDown />} aria-label={t("Move down")} onClick={() => move(bookIndex, bookIndex + 1)} />
                    </Tooltip>
                    <Tooltip title={t("Delete")}>
                      <Button
                        type="text"
                        danger
                        icon={<LuTrash2 />}
                        aria-label={t("Delete")}
                        onClick={() =>
                          confirm({
                            title: t("Delete this objection book?"),
                            description: t("The book and all its objections are removed when you save the course settings"),
                            tone: "danger",
                            okText: t("Delete"),
                            onOk: () => remove(book.name),
                          })
                        }
                      />
                    </Tooltip>
                  </div>
                </div>

                {/* Objeções do livro */}
                <div className="p-4">
                  <Form.List name={[book.name, "items"]}>
                    {(items, itemOps) => (
                      <div className="flex flex-col gap-3">
                        {items.length > 0 && (
                          <Collapse
                            bordered
                            activeKey={openKeys(book.key)}
                            onChange={(keys) => toggle(book.key, [].concat(keys))}
                            items={items.map((item, itemIndex) => ({
                              key: String(item.name),
                              forceRender: true,
                              label: <ObjectionTitle form={form} path={["objection", "tabs", book.name, "items", item.name, "title"]} index={itemIndex + 1} />,
                              extra: (
                                <Tooltip title={t("Delete")}>
                                  <Button
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<LuTrash2 />}
                                    aria-label={t("Delete")}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      confirm({
                                        title: t("Delete this objection?"),
                                        description: t("It is removed when you save the course settings"),
                                        tone: "danger",
                                        okText: t("Delete"),
                                        onOk: () => {
                                          itemOps.remove(item.name);
                                          toggle(book.key, []); // os índices mudam: fecha as objeções deste livro
                                        },
                                      });
                                    }}
                                  />
                                </Tooltip>
                              ),
                              children: (
                                <>
                                  <Form.Item name={[item.name, "title"]} label={t("Title")}>
                                    <Input size="large" />
                                  </Form.Item>
                                  <Form.Item name={[item.name, "text"]} label={t("Text")} className="mb-0!">
                                    <RichTextFormField placeholder={t("Write the content...")} richMedia />
                                  </Form.Item>
                                </>
                              ),
                            }))}
                          />
                        )}
                        <AddTile
                          compact
                          icon={<LuMessageSquareWarning />}
                          label={t("Add objection")}
                          onClick={() => {
                            itemOps.add({ title: "", text: "" });
                            // O painel novo abre de imediato, para escrever
                            toggle(book.key, [...openKeys(book.key), String(items.length)]);
                          }}
                        />
                      </div>
                    )}
                  </Form.List>
                </div>
              </div>
            ))}

            <AddTile compact icon={<LuBookOpen />} label={t("Add objection book")} onClick={() => add({ label: `${t("Objection book")} ${books.length + 1}`, items: [] })} />
          </div>
        )}
      </Form.List>
    </>
  );
}
