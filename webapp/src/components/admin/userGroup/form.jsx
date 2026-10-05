import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { Button, Drawer, Form, Input, Table } from "antd";
import { RxTrash } from "react-icons/rx";
import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import { requiredRule } from "../../../utils/formFieldError";
import UserSelect from "../userSelect";

// Criar e editar um grupo; os membros só se gerem ao editar (sem um grupo criado não há a quem os associar)
export default function UserGroupForm({ data, open, close }) {
  const isUpdate = !!data?.id;
  const { create, update, toastApi } = useContext(Context);
  const { t } = useTranslation();
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [members, setMembers] = useState([]);
  const [userToAdd, setUserToAdd] = useState(null);
  const [hasMembersError, setHasMembersError] = useState(false);

  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    if (isUpdate) {
      form.setFieldsValue(data);
      getMembers();
    } else {
      form.resetFields();
      setMembers([]);
    }
  }, [open, data]);

  function getMembers() {
    axios
      .get(endpoints.userGroup.members, { params: { id_group: data.id } })
      .then((res) => {
        setMembers(res.data);
        setHasMembersError(false);
      })
      .catch((err) => {
        console.log(err);
        setHasMembersError(true);
        toastApi.open({ type: "error", content: t("Failed to load the members of this group. Reload before saving, so they are not removed by mistake") });
      });
  }

  function addMember(id) {
    setUserToAdd(null);
    if (!id) return;
    axios
      .get(endpoints.user.search, { params: { ids: String(id) } })
      .then((res) => res.data[0] && setMembers((prev) => (prev.some((m) => m.id === id) ? prev : [...prev, res.data[0]])))
      .catch(() => toastApi.open({ type: "error", content: t("Failed to load the users") }));
  }

  function removeMember(id) {
    setMembers((prev) => prev.filter((u) => u.id !== id));
  }

  function onClose() {
    form.resetFields();
    close();
  }

  async function submit(values) {
    if (isUpdate && hasMembersError) {
      toastApi.open({ type: "error", content: t("Failed to load the members of this group. Reload before saving, so they are not removed by mistake") });
      return;
    }
    setIsButtonLoading(true);
    try {
      const res = isUpdate ? await update({ data: { ...values }, table: "userGroup" }) : await create({ data: { ...values }, table: "userGroup" });

      // create()/update() já mostraram o seu toast se falharam: chegar aqui significa que o grupo ficou guardado,
      // por isso um erro a seguir (só nos membros) precisa de mensagem própria
      const id_group = isUpdate ? data.id : res.data.insertId;
      try {
        await axios.post(endpoints.userGroup.setMembers, { data: { id_group, id_users: members.map((u) => u.id) } });
      } catch (err) {
        console.log(err);
        toastApi.open({ type: "error", content: t("The group was saved, but the members could not be saved. Try again") });
        setIsButtonLoading(false);
        return;
      }

      setIsButtonLoading(false);
      form.resetFields();
      close(true);
    } catch (err) {
      console.log(err);
      setIsButtonLoading(false);
    }
  }

  return (
    <Drawer
      open={open}
      size={800}
      onClose={onClose}
      mask={{ closable: false }}
      title={isUpdate ? t("Update user group") : t("Add user group")}
      extra={[
        <Button key="save" type="primary" loading={isButtonLoading} onClick={form.submit}>
          {t("Save")}
        </Button>,
      ]}>
      <Form form={form} onFinish={submit} layout="vertical">
        {isUpdate && (
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
        )}
        <Form.Item name="name" label={t("Group name")} rules={[requiredRule]}>
          <Input size="large" placeholder={t("E.g. Medical team")} />
        </Form.Item>
      </Form>

      {isUpdate ? (
        <>
          <p className="mb-2 mt-6">{t("Add member")}</p>
          <UserSelect multiple={false} value={userToAdd} onChange={addMember} excludeIds={members.map((m) => m.id)} />

          <p className="mb-2 mt-6">
            {t("Members")} ({members.length})
          </p>
          <Table
            rowKey="id"
            pagination={members.length > 10 ? { pageSize: 10 } : false}
            dataSource={members}
            columns={[
              { title: t("Name"), dataIndex: "name", key: "name" },
              { title: t("E-mail"), dataIndex: "email", key: "email" },
              {
                title: "",
                key: "actions",
                width: 60,
                render: (_, record) => <Button danger icon={<RxTrash />} onClick={() => removeMember(record.id)} />,
              },
            ]}
            locale={{ emptyText: t("No members yet") }}
          />
        </>
      ) : (
        <p className="text-[12px] italic text-[#666] mt-4">{t("You can add members after creating the group")}</p>
      )}
    </Drawer>
  );
}
