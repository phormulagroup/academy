import axios from "axios";
import { useContext, useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Divider, Empty, Form, Input, Select, Skeleton, Tag } from "antd";
import dayjs from "dayjs";
import { LuAward, LuBookOpen, LuCircleCheck, LuLock, LuPlay, LuSearch, LuUser, LuIdCard, LuMail, LuMapPin } from "react-icons/lu";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import api from "../../../utils/api";
import PasswordChangedLogout from "../../../components/passwordChangedLogout";
import config from "../../../utils/config";
import { downloadCertificate } from "../../../utils/certificate";
import { usePermission } from "../../../utils/usePermission";
import { courseStats } from "../../../utils/userResults";
import UserAvatar from "../../../utils/userAvatar";
import CourseResult from "../../../components/admin/user/courseResult";
import {
  emailFieldProps,
  emailRule,
  matchFieldRule,
  requiredDateRule,
  requiredRule,
  requiredSelectRule,
  userEmailRule,
  passwordRule,
} from "../../../utils/formFieldError";
import { academicBackgroundOptions, genderOptions, namePlaceholders, splitName } from "../../../utils/userFields";

const STATUS_TAGS = {
  approved: { label: "Approved", context: "user", color: "green" },
  pending: { label: "Pending", color: "orange" },
  not_approved: { label: "Not Approved", color: "red" },
};

const SummaryTile = ({ icon, label, value, loading = false }) => (
  <div className="flex items-center gap-3 rounded-[14px] bg-white p-4 shadow">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#E6F9FC] text-[20px] text-[#163986]">{icon}</span>
    <div>
      {loading ? <Skeleton.Input active size="small" style={{ width: 40, minWidth: 40, height: 26 }} /> : <p className="mb-0! text-[22px] font-bold leading-tight">{value}</p>}
      <p className="mb-0! text-[12px] text-[#8A8D98]">{label}</p>
    </div>
  </div>
);

const SectionTitle = ({ icon, children }) => (
  <p className="mb-4! flex items-center gap-2 text-[15px] font-bold">
    <span className="text-[#163986]">{icon}</span>
    {children}
  </p>
);

// Detalhes de um utilizador no backoffice: resumo, resultados por curso e edição da conta
export default function UserDetails() {
  const { user, languages, toastApi } = useContext(Context);
  const { t, i18n } = useTranslation();
  // /admin/perfil (sem id) é o perfil de quem está autenticado; /admin/users/:id é o de qualquer utilizador
  const { id: paramId } = useParams();
  const isProfile = paramId === undefined;
  const id = paramId ?? user.id;
  const navigate = useNavigate();
  const { canUpdate: canUpdateUsers } = usePermission("user");
  // Cada um edita a sua conta; editar as dos outros exige permissão
  const isOwnAccount = Number(id) === user.id;
  const canEdit = canUpdateUsers || isOwnAccount;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState({});
  const [courseData, setCourseData] = useState([]);
  const [countries, setCountries] = useState([]);
  const [view, setView] = useState("results");
  const [courseSearch, setCourseSearch] = useState("");

  // Exemplos de Nome e Apelido no idioma atual
  const placeholders = namePlaceholders(i18n.language);
  const [form] = Form.useForm();

  useEffect(() => {
    getData();
  }, [id]);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.user.readById, { params: { id } })
      .then((res) => {
        setData(res.data.user ?? {});
        if (res.data.user) {
          setCountries(
            languages
              .filter((lang) => lang.id === res.data.user.id_lang)
              .flatMap((l) => JSON.parse(l.country).map((c) => ({ value: c, label: t(`${c}`), id_lang: l.id })))
              .sort((a, b) => a.label.localeCompare(b.label)),
          );
          delete res.data.user.password;
          // A BD guarda só name: é dividido em Nome + Apelido para editar
          form.setFieldsValue({ ...res.data.user, ...splitName(res.data.user.name) });
          prepareData(res);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
        toastApi.error(err.response?.data?.message || t("Could not load this user"));
      });
  }

  function prepareData(res) {
    if (res.data.courses.length > 0) {
      let auxCourse = [];
      for (let c = 0; c < res.data.courses.length; c++) {
        let aux = {};
        let auxAllItems = [];
        let course = res.data.courses[c];
        course.settings = course.settings ? JSON.parse(course.settings) : null;

        // Admin can see all courses including draft - backend already filters for regular users
        if (
          course.settings &&
          course.settings.country_limit &&
          !course.settings.country.includes(res.data.user.country)
        )
          continue;

        let courseModules = res.data.modules.filter(
          (m) => m.id_course === course.id,
        );
        let newModules = [];

        if (courseModules.length > 0) {
          for (let i = 0; i < courseModules.length; i++) {
            courseModules[i].items = courseModules[i].items
              ? JSON.parse(courseModules[i].items)
              : null;
            if (courseModules[i].items) {
              for (let y = 0; y < courseModules[i].items.length; y++) {
                if (courseModules[i].items[y].type === "topic")
                  courseModules[i].items[y] = {
                    type: courseModules[i].items[y].type,
                    ...res.data.topics.filter(
                      (_t) => _t.id === courseModules[i].items[y].id,
                    )[0],
                  };
                if (courseModules[i].items[y].type === "test")
                  courseModules[i].items[y] = {
                    type: courseModules[i].items[y].type,
                    ...res.data.tests.filter(
                      (_t) => _t.id === courseModules[i].items[y].id,
                    )[0],
                  };

                auxAllItems.push(courseModules[i].items[y]);
              }
              newModules.push(courseModules[i]);
            }
          }
        }

        aux.course = course;
        aux.modules = newModules;
        aux.progress = res.data.progress.filter(
          (p) => p.id_course === course.id && p.id_user === parseInt(id),
        );
        aux.allItems = auxAllItems;
        auxCourse.push(aux);
      }
      setCourseData(auxCourse);
    }
  }

  // A própria password alterada: animação e a sessão termina ao fim de 5 s
  const [passwordChanged, setPasswordChanged] = useState(false);

  function submit(values) {
    const payload = { ...values, id };
    if (payload.password) payload.new_password = payload.password;
    delete payload.password;
    delete payload.confirm_password;

    setIsSaving(true);
    axios
      .post(endpoints.user.update, { data: payload })
      .then((res) => {
        if (res.data.user && isOwnAccount && payload.new_password) {
          form.setFieldsValue({ current_password: undefined, password: undefined, confirm_password: undefined });
          setPasswordChanged(true);
        } else if (res.data.user) {
          // A própria conta: guarda o token novo (muda com a password), senão a sessão terminava no pedido a seguir
          if (isOwnAccount && res.data.token) {
            localStorage.setItem("token", res.data.token);
            api.token(res.data.token);
          }
          toastApi.success(t("Account updated successfully!"));
          form.setFieldsValue({ current_password: undefined, password: undefined, confirm_password: undefined });
          getData();
        } else {
          toastApi.error(t("Something wrong happened, try again please."));
        }
      })
      .catch((err) => {
        console.log(err);
        if (err.response?.data?.code === "invalid_current_password") return form.setFields([{ name: "current_password", errors: [t("The current password is incorrect")] }]);
        toastApi.error(err.response?.data?.message || t("Something wrong happened, try again please."));
      })
      .finally(() => setIsSaving(false));
  }

  // O certificado é do aluno (nome dele), não de quem está a ver a página
  const handleDownloadCertificate = (course, progress) => downloadCertificate(course, progress, data);

  const summary = useMemo(() => {
    const stats = courseData.map(courseStats);
    return {
      courses: courseData.length,
      inProgress: stats.filter((s) => s.status === "in_progress").length,
      completed: stats.filter((s) => s.status === "completed").length,
      certificates: stats.filter((s) => s.hasCertificate).length,
    };
  }, [courseData]);

  // Cursos por ordem da última atividade do aluno (os mais recentes primeiro; sem atividade, no fim por nome) e filtrados pela pesquisa
  const visibleCourses = useMemo(() => {
    const term = courseSearch.trim().toLowerCase();
    const lastActivity = (c) => c.progress.reduce((max, p) => Math.max(max, new Date(p.created_at).getTime() || 0), 0);
    return courseData
      .filter((c) => !term || `${c.course.name} ${c.course.internal_name ?? ""}`.toLowerCase().includes(term))
      .map((c) => ({ c, last: lastActivity(c) }))
      .sort((a, b) => b.last - a.last || (a.c.course.name || "").localeCompare(b.c.course.name || ""))
      .map((x) => x.c);
  }, [courseData, courseSearch]);

  const statusTag = STATUS_TAGS[data.status];
  const loadingUser = isLoading && !data.id;

  return (
    <div className="flex w-full flex-col gap-6">
      <PasswordChangedLogout open={passwordChanged} />
      <div className="flex items-center justify-between">
        <p className="mb-0! text-[18px] font-bold font-ryker">{isProfile ? t("My profile") : t("Student account")}</p>
        {!isProfile && (
          <button type="button" className="cursor-pointer border-0 bg-transparent text-sm text-[#163986]" onClick={() => navigate("/admin/users")}>
            « {t("Go back")}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-6 rounded-[16px] bg-white p-6 shadow md:p-8">
        {loadingUser ? (
          <div className="flex min-w-0 flex-1 items-center gap-5">
            <Skeleton.Avatar active size={88} />
            <Skeleton active title={{ width: 220 }} paragraph={{ rows: 2, width: [320, 200] }} className="max-w-xl" />
          </div>
        ) : (
        <div className="flex min-w-0 items-center gap-5">
          <UserAvatar user={data} size={88} className="shrink-0" />
          <div className="min-w-0">
            <p className="mb-1! truncate text-[24px] font-bold">{data.name}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#5B5F6B]">
              {data.email && (
                <span className="flex items-center gap-1.5">
                  <LuMail /> {data.email}
                </span>
              )}
              {data.country && (
                <span className="flex items-center gap-1.5">
                  <LuMapPin /> {t(data.country)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <LuIdCard /> ID {data.id}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {data.role_name && <Tag color="#163986" className="m-0!">{data.role_name}</Tag>}
              {statusTag && (
                <Tag color={statusTag.color} className="m-0!">
                  {t(statusTag.label, { context: statusTag.context })}
                </Tag>
              )}
              {!!data.is_deleted && (
                <Tag color="red" className="m-0!">
                  {t("Inactive")}
                </Tag>
              )}
              {data.created_at && <span className="text-[12px] text-[#8A8D98]">{t("Registered on")} {dayjs(data.created_at).format("DD/MM/YYYY")}</span>}
            </div>
          </div>
        </div>
        )}
        <div className="flex rounded-[12px] bg-[#F2F3F5] p-1">
          {[
            { value: "results", label: t("Results"), icon: <LuBookOpen /> },
            { value: "account", label: t("Account"), icon: <LuUser /> },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setView(item.value)}
              className={`flex cursor-pointer items-center gap-2 rounded-[9px] border-0 px-4 py-2 text-[14px] font-medium transition-colors ${view === item.value ? "bg-[#163986] text-white" : "bg-transparent text-[#5B5F6B] hover:bg-white"}`}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryTile icon={<LuBookOpen />} label={t("Course(s)")} value={summary.courses} loading={isLoading} />
        <SummaryTile icon={<LuPlay />} label={t("In progress")} value={summary.inProgress} loading={isLoading} />
        <SummaryTile icon={<LuCircleCheck />} label={t("Completed")} value={summary.completed} loading={isLoading} />
        <SummaryTile icon={<LuAward />} label={t("Certificate(s)")} value={summary.certificates} loading={isLoading} />
      </div>

      {view === "results" ? (
        <div className="rounded-[16px] bg-white p-6 shadow lg:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-1! text-xl font-bold">{t("Results")}</p>
              <p className="mb-0! text-[14px] text-[#8A8D98]">{isProfile ? t("Your progress and tests in each course") : t("Progress and tests of this student in each course")}</p>
            </div>
            {courseData.length > 1 && <Input allowClear className="w-full sm:w-72" prefix={<LuSearch className="text-[#8A8D98]" />} placeholder={t("Search course...")} value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)} />}
          </div>
          {isLoading && courseData.length === 0 ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : courseData.length > 0 ? (
            <div className="flex flex-col gap-4">
              {visibleCourses.map((c) => (
                <CourseResult key={c.course.id} course={c} student={data} onChange={getData} onDownloadCertificate={handleDownloadCertificate} />
              ))}
              {visibleCourses.length === 0 && <Empty description={t("No courses match your search")} />}
            </div>
          ) : (
            <Empty description={t("No courses available")} />
          )}
        </div>
      ) : (
        <div className="rounded-[16px] bg-white p-6 shadow lg:p-8">
          <p className="mb-1! text-xl font-bold">{t("Account")}</p>
          <p className="mb-6! text-[14px] text-[#8A8D98]">{canEdit ? (isProfile ? t("Your personal data and password") : isOwnAccount ? t("Personal data and password of this student") : t("Personal data of this student")) : t("You do not have permission to edit this account")}</p>
          <Form form={form} onFinish={submit} onFinishFailed={() => toastApi.error(t("Fill in the highlighted fields correctly."))} layout="vertical" disabled={!canEdit} validateTrigger="onSubmit">
            <SectionTitle icon={<LuUser />}>{t("Personal data")}</SectionTitle>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
              <Form.Item name="first_name" label={t("First Name")} rules={[requiredRule]} className="mb-0!">
                <Input placeholder={placeholders.first_name} />
              </Form.Item>
              <Form.Item name="last_name" label={t("Last Name")} rules={[requiredRule]} className="mb-0!">
                <Input placeholder={placeholders.last_name} />
              </Form.Item>
              {/* Formato do e-mail e não usado por outra conta (a do próprio aluno é ignorada) */}
              <Form.Item
                name="email"
                label={t("E-mail")}
                {...emailFieldProps}
                rules={[requiredRule, emailRule, userEmailRule({ excludeId: Number(id) })]}
                className="mb-0!">
                <Input type="email" placeholder={t("youremail@domain.com")} />
              </Form.Item>
              <Form.Item name="gender" label={t("Gender")} rules={[requiredSelectRule]} className="mb-0!">
                <Select placeholder={t("Gender")} allowClear options={genderOptions(t, i18n.language)} />
              </Form.Item>
              <Form.Item label={t("Birth date")} name="birth_date" rules={[requiredDateRule]} className="mb-0!" getValueProps={(value) => ({ value: value && dayjs(value) })}>
                <DatePicker placeholder={t("Select birth date")} className="w-full" />
              </Form.Item>
              <Form.Item name="country" label={t("Country")} rules={[requiredSelectRule]} className="mb-0!">
                <Select placeholder={t("Choose a country")} showSearch={{ optionFilterProp: "label" }} allowClear options={countries.map((item) => ({ label: item.label, value: item.value }))} />
              </Form.Item>
              <Form.Item label={t("Academic background")} name="academic_background" rules={[requiredSelectRule]} className="mb-0!">
                <Select placeholder={t("Academic background")} showSearch={{ optionFilterProp: "label" }} allowClear options={academicBackgroundOptions(t)} />
              </Form.Item>
              <Form.Item label={t("Bial's starting date")} name="bial_starting_date" rules={[requiredDateRule]} className="mb-0!" getValueProps={(value) => ({ value: value && dayjs(value) })}>
                <DatePicker placeholder={t("Select Bial's starting date")} className="w-full" />
              </Form.Item>
            </div>

            {/* A palavra-passe só se altera na própria conta: um admin não pode trocar a de outros utilizadores */}
            {isOwnAccount && (
              <>
            <Divider />
  
              <SectionTitle icon={<LuLock />}>{t("Password")}</SectionTitle>
              <p className="mb-4! text-[13px] text-[#8A8D98]">{t("Leave empty to keep the current password")}</p>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
                <Form.Item label={t("Current password")} name="current_password" dependencies={["password"]} rules={[({ getFieldValue }) => ({ required: !!getFieldValue("password"), message: t("Enter your current password to change it") })]} className="mb-0!">
                    <Input.Password autoComplete="current-password" placeholder={t("Enter your current password")} />
                  </Form.Item>
                <Form.Item label={t("New password")} name="password" rules={[passwordRule]} className="mb-0!">
                  <Input.Password placeholder={t("Enter a new password")} />
                </Form.Item>
                <Form.Item label={t("Confirm password")} name="confirm_password" dependencies={["password"]} rules={[matchFieldRule("password", t("The passwords does not match!"))]} className="mb-0!">
                  <Input.Password placeholder={t("Repeat the new password")} />
                </Form.Item>
              </div>
              </>
            )}

            {canEdit && (
              <div className="mt-8 flex justify-end">
                <Button type="primary" loading={isSaving} onClick={form.submit} className="w-full md:w-auto md:min-w-48">
                  {t("Save")}
                </Button>
              </div>
            )}
          </Form>
        </div>
      )}
    </div>
  );
}
