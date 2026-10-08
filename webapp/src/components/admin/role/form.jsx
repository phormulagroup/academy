import { useContext, useEffect, useMemo, useState } from "react";
import { Alert, Button, Drawer, Form, Input, Spin, Switch, Tooltip } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import axios from "axios";
import { useTranslation } from "react-i18next";
import {
  LuActivity,
  LuHistory,
  LuLockKeyhole,
  LuSend,
  LuAward,
  LuBell,
  LuChartColumn,
  LuCircleHelp,
  LuDownload,
  LuEraser,
  LuEye,
  LuFileText,
  LuGraduationCap,
  LuImages,
  LuLanguages,
  LuLayoutTemplate,
  LuMessageSquareText,
  LuPalette,
  LuPencil,
  LuPill,
  LuPlus,
  LuQrCode,
  LuServer,
  LuShieldCheck,
  LuSettings,
  LuTicket,
  LuTrash2,
  LuUsers,
  LuUsersRound,
} from "react-icons/lu";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import { RESOURCES } from "../../../utils/permissions";

const ADMIN_ROLE_ID = 1;
// O Gestor (como o Utilizador) tem matriz de permissões, mas não se renomeia
const GESTOR_ROLE_ID = 4;
const USER_ROLE_ID = 2;

// "Ver" primeiro: é a base das outras três (ver toggle)
const ACTIONS = [
  { key: "can_read", label: "View", icon: <LuEye /> },
  { key: "can_create", label: "Create", icon: <LuPlus /> },
  { key: "can_update", label: "Edit", icon: <LuPencil /> },
  { key: "can_delete", label: "Delete", icon: <LuTrash2 /> },
];

// Só apresentação: agrupa as secções como no menu do backoffice. Uma secção nova que não esteja aqui aparece em "Other".
// Secções do grupo Sistema: só o Admin altera as permissões delas
const SYSTEM_RESOURCES = ["monitoring", "audit", "security"];
const GROUPS = [
  { key: "web", label: "Website", resources: ["media", "iec", "personalization", "language", "notification", "faqs"] },
  { key: "learning", label: "e-Learning", resources: ["course", "certificate", "report", "document", "download", "product"] },
  { key: "manage", label: "Management", resources: ["user", "user_group", "form_submission", "ticket"] },
  { key: "email", label: "E-mail", resources: ["communication", "email_template", "settings"] },
  { key: "system", label: "System", resources: ["monitoring", "audit", "security"] },
];

const RESOURCE_ICONS = {
  course: <LuGraduationCap />,
  certificate: <LuAward />,
  report: <LuChartColumn />,
  document: <LuFileText />,
  download: <LuDownload />,
  product: <LuPill />,
  media: <LuImages />,
  iec: <LuQrCode />,
  faqs: <LuCircleHelp />,
  notification: <LuBell />,
  language: <LuLanguages />,
  personalization: <LuPalette />,
  user: <LuUsers />,
  user_group: <LuUsersRound />,
  form_submission: <LuMessageSquareText />,
  ticket: <LuTicket />,
  monitoring: <LuActivity />,
  audit: <LuHistory />,
  security: <LuLockKeyhole />,
  communication: <LuSend />,
  email_template: <LuLayoutTemplate />,
  settings: <LuServer />,
};

// Ações que cada secção tem: todas as quatro, salvo as que o `actions` da secção restringe (ex.: o registo de atividade só se vê)
const ALL_ACTIONS = ACTIONS.map((a) => a.key);
const actionsOf = (resource) => ACTIONS.filter((a) => (resource.actions ?? ALL_ACTIONS).includes(a.key));

const emptyRow = () => ({ can_create: false, can_read: false, can_update: false, can_delete: false });
const fullRow = () => ({ can_create: true, can_read: true, can_update: true, can_delete: true });

// Um só componente para criar e editar uma função. Ao criar só pede o nome e fica logo em modo de edição para definir as
// permissões; ao editar guarda nome e permissões de uma vez. O Admin tem sempre acesso total (o servidor ignora a tabela
// de permissões para ele), por isso não tem matriz.
export default function RoleForm({ data, open, close }) {
  const { toastApi, setRoles, user } = useContext(Context);
  // O Admin altera tudo. O Gestor vê todas as matrizes e só altera a do Utilizador (aluno), sem a parte do Sistema
  const isAdminUser = Number(user?.id_role) === ADMIN_ROLE_ID;
  const isGestorUser = Number(user?.id_role) === GESTOR_ROLE_ID;
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [matrix, setMatrix] = useState({});
  // Cópia local de `data`: ao criar passa a apontar para a função recém-criada, sem fechar a gaveta
  const [localRole, setLocalRole] = useState(data);
  const isUpdate = !!localRole?.id;
  const isAdminRole = localRole?.id === ADMIN_ROLE_ID;
  const isGestorRole = localRole?.id === GESTOR_ROLE_ID;
  const canEdit = isAdminUser || (isGestorUser && localRole?.id === USER_ROLE_ID);
  const canEditResource = (key) => isAdminUser || (canEdit && !SYSTEM_RESOURCES.includes(key));
  // Porque não se pode mexer (tooltip nos controlos bloqueados, em vez de só ficarem desativados)
  const lockedReason = (key) =>
    !canEdit ? t("Only the Admin can change the permissions of this role.") : !canEditResource(key) ? t("Only the Admin can change the System permissions.") : null;
  // O Admin tem acesso total: sem matriz de permissões
  const isFixedRole = isAdminRole;
  // "Guardar" substitui SEMPRE as permissões da função pelo conteúdo da matriz: se o carregamento das atuais falhar, a
  // matriz fica vazia e guardar apagaria permissões reais. Esta flag bloqueia o "Guardar" nesse caso.
  const [hasLoadError, setHasLoadError] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    setLocalRole(data);
    if (data?.id) {
      form.setFieldsValue({ name: data.name });
      if (data.id !== ADMIN_ROLE_ID) getPermissions(data.id);
    } else {
      form.resetFields();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, data]);

  function getPermissions(idRole) {
    setIsLoading(true);
    setHasLoadError(false);
    axios
      .get(endpoints.permission.read, { params: { id_role: idRole } })
      .then((res) => {
        const aux = {};
        for (const resource of RESOURCES) {
          const row = res.data.find((p) => p.resource === resource.key);
          aux[resource.key] = { can_create: !!row?.can_create, can_read: !!row?.can_read, can_update: !!row?.can_update, can_delete: !!row?.can_delete };
        }
        setMatrix(aux);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setHasLoadError(true);
        setIsLoading(false);
        toastApi.open({ type: "error", content: t("Could not load the current permissions of this role. Close and reopen before saving, so they are not erased by mistake.") });
      });
  }

  // Criar/Editar/Apagar sem Ver não faz sentido: ligar qualquer um liga também o Ver; desligar o Ver desliga tudo
  function toggle(resourceKey, actionKey) {
    if (!canEditResource(resourceKey)) return;
    setMatrix((prev) => {
      const row = { ...emptyRow(), ...prev[resourceKey] };
      const next = !row[actionKey];
      if (actionKey === "can_read" && !next) return { ...prev, [resourceKey]: emptyRow() };
      row[actionKey] = next;
      if (next) row.can_read = true;
      return { ...prev, [resourceKey]: row };
    });
  }

  const resourceOf = (key) => RESOURCES.find((r) => r.key === key);
  const isRowFull = (key) => actionsOf(resourceOf(key)).every((a) => !!matrix[key]?.[a.key]);
  const rowCount = (key) => actionsOf(resourceOf(key)).filter((a) => !!matrix[key]?.[a.key]).length;
  // Linha cheia só com as ações que a secção tem
  const fullRowOf = (key) => () => Object.fromEntries(ALL_ACTIONS.map((a) => [a, actionsOf(resourceOf(key)).some((x) => x.key === a)]));

  function setResources(keys, builder) {
    setMatrix((prev) => {
      const next = { ...prev };
      keys.filter(canEditResource).forEach((k) => (next[k] = (builder === fullRow ? fullRowOf(k) : builder)()));
      return next;
    });
  }

  const groups = useMemo(() => {
    const known = new Set(GROUPS.flatMap((g) => g.resources));
    const byKey = new Map(RESOURCES.map((r) => [r.key, r]));
    const list = GROUPS.map((g) => ({ ...g, items: g.resources.map((k) => byKey.get(k)).filter(Boolean) })).filter((g) => g.items.length);
    const others = RESOURCES.filter((r) => !known.has(r.key));
    if (others.length) list.push({ key: "other", label: "Other", items: others });
    return list;
  }, []);

  const totalPossible = RESOURCES.reduce((sum, r) => sum + actionsOf(r).length, 0);
  const totalActive = RESOURCES.reduce((sum, r) => sum + rowCount(r.key), 0);

  function onClose() {
    form.resetFields();
    close();
  }

  function submitCreate(values) {
    setIsButtonLoading(true);
    axios
      .post(endpoints.role.create, { data: values })
      .then((res) => {
        axios.get(endpoints.role.read).then((r) => setRoles(r.data));
        toastApi.open({ type: "success", content: t("Role created. Now set its permissions below.") });
        setIsButtonLoading(false);
        setLocalRole({ id: res.data.insertId, name: values.name });
        setMatrix(Object.fromEntries(RESOURCES.map((r) => [r.key, emptyRow()])));
      })
      .catch((err) => {
        console.log(err);
        toastApi.open({ type: "error", content: err.response?.data?.message || t("Could not create the role.") });
        setIsButtonLoading(false);
      });
  }

  async function submitUpdate(values) {
    if (hasLoadError) {
      toastApi.open({ type: "error", content: t("Could not load the current permissions of this role. Close and reopen before saving, so they are not erased by mistake.") });
      return;
    }
    setIsButtonLoading(true);
    try {
      if (values.name !== localRole.name) {
        await axios.post(endpoints.role.update, { data: { id: localRole.id, name: values.name } });
      }
      if (!isFixedRole) {
        const permissions = RESOURCES.map((resource) => ({ resource: resource.key, ...emptyRow(), ...matrix[resource.key] }));
        await axios.post(endpoints.permission.set, { data: { id_role: localRole.id, permissions } });
      }
      const rolesRes = await axios.get(endpoints.role.read);
      setRoles(rolesRes.data);
      toastApi.open({ type: "success", content: t("Role updated successfully.") });
      setIsButtonLoading(false);
      close(true);
    } catch (err) {
      console.log(err);
      toastApi.open({ type: "error", content: err.response?.data?.message || t("Could not save the role.") });
      setIsButtonLoading(false);
    }
  }

  return (
    <Drawer
      open={open}
      size={860}
      onClose={onClose}
      mask={{ closable: false }}
      title={isUpdate ? t("Update role") : t("Add role")}
      extra={[
        <Button key="save" type="primary" loading={isButtonLoading} disabled={!canEdit || (isUpdate && hasLoadError)} onClick={form.submit}>
          {isUpdate ? t("Save") : t("Add")}
        </Button>,
      ]}
    >
      <Form
        form={form}
        onFinish={(values) => (isUpdate ? submitUpdate(values) : submitCreate(values))}
        onFinishFailed={() => toastApi.open({ type: "error", content: t("Fill in the highlighted fields correctly.") })}
        layout="vertical"
        validateTrigger="onSubmit"
        validateMessages={{ required: t("This field is required!") }}
      >
        {/* Admin e Utilizador têm o nome fixo; do Utilizador (a função do registo) só se editam as permissões */}
        <Form.Item name="name" label={t("Role name")} rules={[{ required: true }]} className="mb-0!" extra={isUpdate && (localRole?.id === USER_ROLE_ID || isGestorRole) ? t("This is the role given at registration: its name is fixed, only its permissions can be changed") : undefined}>
          <Input placeholder={t("E.g.: Content manager")} disabled={!isAdminUser || isAdminRole || (isUpdate && (localRole?.id === USER_ROLE_ID || isGestorRole))} />
        </Form.Item>
      </Form>

      {isUpdate && isAdminRole && (
        <Alert
          className="mt-6!"
          type="info"
          showIcon
          icon={<LuShieldCheck />}
          title={t("The Admin always has full access to every section.")}
          description={t("Permissions are only set for the other roles.")}
        />
      )}

      {isUpdate && !isFixedRole && (
        <div className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <p className="font-bold text-[16px] mb-0!">{t("Permissions")}</p>
              <p className="text-[12px] text-[#8A8D98] mb-0!">
                {t("{{active}} of {{total}} active · turning on Create, Edit or Delete also turns on View.", { active: totalActive, total: totalPossible })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="small" onClick={() => setResources(RESOURCES.map((r) => r.key), fullRow)} disabled={isLoading || !canEdit} title={!canEdit ? t("Only the Admin can change the permissions of this role.") : undefined}>
                {t("Full access")}
              </Button>
              <Button size="small" onClick={() => setResources(RESOURCES.map((r) => r.key), () => ({ ...emptyRow(), can_read: true }))} disabled={isLoading || !canEdit} title={!canEdit ? t("Only the Admin can change the permissions of this role.") : undefined}>
                {t("View only")}
              </Button>
              <Button size="small" icon={<LuEraser />} onClick={() => setResources(RESOURCES.map((r) => r.key), emptyRow)} disabled={isLoading || !canEdit} title={!canEdit ? t("Only the Admin can change the permissions of this role.") : undefined}>
                {t("Clear")}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Spin indicator={<LoadingOutlined spin />} />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((group) => {
                const keys = group.items.map((r) => r.key);
                const groupActive = keys.reduce((s, k) => s + rowCount(k), 0);
                return (
                  <div key={group.key} className="rounded-[14px] border border-[#ECEEF1] overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#F7F8FA] border-b border-[#ECEEF1]">
                      <p className="mb-0! text-[12px] font-bold uppercase tracking-wide text-[#5B5F6B]">
                        {t(group.label)}
                        <span className="ml-2 font-normal normal-case tracking-normal text-[#8A8D98]">
                          {groupActive}/{group.items.reduce((sum, r) => sum + actionsOf(r).length, 0)}
                        </span>
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[#8A8D98]">{t("All")}</span>
                        <Tooltip title={lockedReason(keys[0])}>
                          <Switch disabled={!keys.some(canEditResource)} size="small" checked={keys.every(isRowFull)} onChange={(on) => setResources(keys, on ? fullRow : emptyRow)} />
                        </Tooltip>
                      </div>
                    </div>
                    {group.items.map((resource, i) => (
                      <div
                        key={resource.key}
                        className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${i > 0 ? "border-t border-[#F1F2F4]" : ""} hover:bg-[#FAFAFB]`}
                      >
                        <div className="flex items-center gap-3 min-w-[180px] flex-1">
                          <span
                            className={`flex items-center justify-center w-8 h-8 rounded-[8px] text-[16px] ${
                              rowCount(resource.key) > 0 ? "bg-[#163986]/10 text-[#163986]" : "bg-[#F2F3F5] text-[#8A8D98]"
                            }`}
                          >
                            {RESOURCE_ICONS[resource.key] || <LuSettings />}
                          </span>
                          <span className="text-[14px] font-medium">{t(resource.label)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {actionsOf(resource).map((action) => {
                            const on = !!matrix[resource.key]?.[action.key];
                            return (
                              <Tooltip key={action.key} title={lockedReason(resource.key)}>
                              <button
                                key={action.key}
                                type="button"
                                aria-pressed={on}
                                onClick={() => toggle(resource.key, action.key)}
                                disabled={!canEditResource(resource.key)}
                                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[12px] font-medium transition-colors disabled:cursor-not-allowed ${canEditResource(resource.key) ? "cursor-pointer" : ""} ${
                                  on ? "bg-[#163986] border-[#163986] text-white" : "bg-white border-[#E2E4E9] text-[#5B5F6B] hover:border-[#163986] hover:text-[#163986]"
                                }`}
                              >
                                <span className="text-[13px] flex">{action.icon}</span>
                                {t(action.label)}
                              </button>
                              </Tooltip>
                            );
                          })}
                          <Tooltip title={lockedReason(resource.key) || (isRowFull(resource.key) ? t("Remove all") : t("Give all"))}>
                            <Switch disabled={!canEditResource(resource.key)} size="small" className="ml-2!" checked={isRowFull(resource.key)} onChange={(on) => setResources([resource.key], on ? fullRow : emptyRow)} />
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
