import { useContext, useEffect, useMemo } from "react";
import { useState } from "react";
import { Button, Empty, Form, Input, Progress, Select, Spin, Tooltip } from "antd";
import dayjs from "dayjs";
import { LuArrowUpRight, LuBookOpen, LuCircleCheck, LuMapPin, LuPlay } from "react-icons/lu";
import { IoSearch } from "react-icons/io5";

import { Context } from "../../../utils/context";

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import UserCell from "../../../components/admin/userCell";

export default function StudentProgress({ data, isLoading }) {
  const { languages, selectedLanguage } = useContext(Context);
  const [countries, setCountries] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [form] = Form.useForm();

  const { t } = useTranslation();

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      // Filtra apenas os estudantes aprovados pelo administrador, excluindo administradores (id_role = 1)
      const approvedStudents = data.users.filter(
        (u) => u.id_role === 2 && u.status?.toLowerCase() === "approved",
      );
      setFilteredData(approvedStudents);
    }
  }, [data]);

  useEffect(() => {
    setCountries(
      JSON.parse(
        languages.filter((l) => l.id === selectedLanguage.id)[0].country,
      ),
    );
  }, [selectedLanguage]);

  // Estatísticas de cada aluno, a partir dos dados que o relatório já devolve (sem pedido novo ao servidor): cursos com atividade,
  // quantos estão em progresso ou concluídos, o progresso médio e a última atividade.
  const statsByUser = useMemo(() => {
    const totals = new Map(); // id_course -> nº de tópicos + testes
    (data.courses || []).forEach((c) => {
      const items = (data.topics || []).filter((x) => x.id_course === c.id).length + (data.tests || []).filter((x) => x.id_course === c.id).length;
      totals.set(c.id, items);
    });

    const perUser = new Map();
    (data.activity || []).forEach((a) => {
      if (a.is_deleted === 1 || !totals.has(a.id_course)) return;
      if (!perUser.has(a.id_user)) perUser.set(a.id_user, new Map());
      const courses = perUser.get(a.id_user);
      if (!courses.has(a.id_course)) courses.set(a.id_course, { done: new Set(), finished: false });
      const course = courses.get(a.id_course);
      if (a.is_completed === 1 && (a.activity_type === "topic" || a.activity_type === "test")) course.done.add(`${a.activity_type}-${a.id_course_topic ?? a.id_course_test}`);
      if (a.is_completed === 1 && a.activity_type === "course") course.finished = true;
      course.last = !course.last || new Date(a.created_at) > new Date(course.last) ? a.created_at : course.last;
    });

    const result = new Map();
    perUser.forEach((courses, id) => {
      let completed = 0;
      let inProgress = 0;
      let percentSum = 0;
      let last = null;
      courses.forEach((course, idCourse) => {
        const total = totals.get(idCourse) || 0;
        const percent = total > 0 ? Math.min(100, Math.round((course.done.size * 100) / total)) : 0;
        if (course.finished || percent === 100) completed += 1;
        else inProgress += 1;
        percentSum += course.finished ? 100 : percent;
        if (!last || new Date(course.last) > new Date(last)) last = course.last;
      });
      result.set(id, { courses: courses.size, completed, inProgress, average: Math.round(percentSum / courses.size), last });
    });
    return result;
  }, [data]);

  function filterData(values) {
    setIsSearching(true);
    console.log(values);
    // Começa com os users regulares (id_role = 2) que foram aprovados pelo administrador
    let newData = data.users.filter(
      (u) => u.id_role === 2 && u.status?.toLowerCase() === "approved",
    );

    if (values.country && values.country.length > 0)
      newData = newData.filter((n) => values.country.includes(n.country));
    if (values.student)
      newData = newData.filter(
        (n) =>
          n.name.toLowerCase().includes(values.student.toLowerCase()) ||
          n.email.toLowerCase().includes(values.student.toLowerCase()) ||
          n.id.toString() === values.student,
      );

    setFilteredData(newData);
    setIsSearching(false);
  }

  return (
    <div>
      <Form form={form} layout="vertical" onFinish={filterData}>
        <div className="flex flex-wrap justify-end items-center gap-4 mb-4 mt-4 [&_.ant-btn]:min-w-[150px]">
          <Form.Item name="country" className="mb-0! w-full sm:w-auto">
            <Select
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              className="w-full sm:w-[260px]!"
              placeholder={t("Select country")}
              showSearch={{ optionFilterProp: ["label"] }}
              options={countries.map((c) => ({ label: t(c), value: c }))}
            />
          </Form.Item>
          <Form.Item name="student" className="mb-0! w-full sm:w-auto">
            <Input className="w-full sm:w-[260px]!" placeholder={t("Search for name, ID or e-mail")} allowClear />
          </Form.Item>
          <Button onClick={form.submit} type="primary" icon={<IoSearch />}>
            {t("Search")}
          </Button>
        </div>
      </Form>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 bg-white rounded-[16px] p-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-10">
            <Spin spinning={true} />
          </div>
        ) : filteredData.length > 0 ? (
          filteredData.map((u) => {
            const st = statsByUser.get(u.id);
            return (
              <Link key={u.id} to={`/admin/users/${u.id}`} className="group block">
                <div className="flex h-full flex-col gap-4 rounded-[16px] border border-solid border-[#E5E7EB] bg-white p-4 transition-all group-hover:border-[#163986]/40 group-hover:shadow-[0px_6px_18px_#16398614]">
                  <div className="flex items-start justify-between gap-2">
                    <UserCell id={u.id} name={u.name} email={u.email} img={u.img} linkToProfile={false} />
                    <LuArrowUpRight className="mt-1 shrink-0 text-[18px] text-[#C0C3CC] transition-colors group-hover:text-[#163986]" />
                  </div>

                  {u.country && (
                    <span className="flex items-center gap-1.5 text-[12px] text-[#5B5F6B]">
                      <LuMapPin className="shrink-0 text-[#8A8D98]" /> {t(u.country)}
                    </span>
                  )}

                  {st ? (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <Tooltip title={t("Courses with activity")}>
                          <div className="flex flex-col items-center rounded-[10px] bg-[#F6F7F9] px-2 py-2">
                            <LuBookOpen className="text-[#163986]" />
                            <span className="text-[16px] font-bold leading-tight">{st.courses}</span>
                            <span className="text-[10px] text-[#8A8D98]">{t("Course(s)")}</span>
                          </div>
                        </Tooltip>
                        <Tooltip title={t("Courses in progress")}>
                          <div className="flex flex-col items-center rounded-[10px] bg-[#E6F9FC] px-2 py-2">
                            <LuPlay className="text-[#00b9d6]" />
                            <span className="text-[16px] font-bold leading-tight">{st.inProgress}</span>
                            <span className="text-[10px] text-[#8A8D98]">{t("In progress")}</span>
                          </div>
                        </Tooltip>
                        <Tooltip title={t("Completed courses")}>
                          <div className="flex flex-col items-center rounded-[10px] bg-[#EEF7F1] px-2 py-2">
                            <LuCircleCheck className="text-[#2F8351]" />
                            <span className="text-[16px] font-bold leading-tight">{st.completed}</span>
                            <span className="text-[10px] text-[#8A8D98]">{t("Completed")}</span>
                          </div>
                        </Tooltip>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-[12px]">
                          <span className="text-[#8A8D98]">{t("Average progress")}</span>
                          <span className="font-bold">{st.average}%</span>
                        </div>
                        <Progress percent={st.average} showInfo={false} size="small" strokeColor="#2F8351" railColor="#EAEAEA" />
                      </div>
                      <p className="mb-0! mt-auto text-[11px] text-[#8A8D98]">
                        {t("Last activity")}: {dayjs(st.last).format("DD/MM/YYYY HH:mm")}
                      </p>
                    </>
                  ) : (
                    <div className="mt-auto rounded-[10px] bg-[#F6F7F9] px-3 py-3 text-center text-[12px] text-[#8A8D98]">{t("No activity yet")}</div>
                  )}
                </div>
              </Link>
            );
          })
        ) : (
          <div className="col-span-full">
            {isSearching ? <Spin spinning={true} /> : <Empty image={<IoSearch className="text-[56px] text-[#BFBFBF] mx-auto" />} styles={{ image: { height: 56 } }} description={t("No student found")} />}
          </div>
        )}
      </div>
    </div>
  );
}
