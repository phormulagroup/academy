import { useContext, useEffect, useMemo, useRef } from "react";
import { useState } from "react";
import {
  Button,
  Empty,
  Form,
  Input,
  Pagination,
  Progress,
  Select,
  Spin,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import {
  LuArrowUpRight,
  LuBookOpen,
  LuCircleCheck,
  LuMapPin,
  LuPlay,
} from "react-icons/lu";
import { IoSearch } from "react-icons/io5";

import { Context } from "../../../utils/context";

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import UserCell from "../../../components/admin/userCell";
import { courseDateState } from "../../../utils/courseStatus";
import {
  activityByStudentCourse,
  reportCourseItems,
  reportCourseState,
} from "../../../utils/userResults";

const PAGE_SIZE = 10;

export default function StudentProgress({ data, isLoading }) {
  const { languages, selectedLanguage } = useContext(Context);
  const [countries, setCountries] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const listRef = useRef(null);

  const [form] = Form.useForm();

  const { t } = useTranslation();

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      // Filtra apenas os estudantes aprovados pelo administrador, excluindo administradores (id_role = 1)
      const approvedStudents = data.users.filter(
        (u) => u.id_role === 2 && u.status?.toLowerCase() === "approved",
      );
      setFilteredData(approvedStudents);
      setCurrentPage(1);
    }
  }, [data]);

  useEffect(() => {
    setCountries(
      JSON.parse(
        languages.filter((l) => l.id === selectedLanguage.id)[0].country,
      ),
    );
  }, [selectedLanguage]);

  // Estatísticas de cada aluno com as mesmas regras do perfil e do backoffice (a página para onde o cartão leva): cursos com atividade
  // que o aluno vê (publicados e dentro das datas; os expirados / por abrir não contam); aprovados (todos os itens feitos); em progresso
  // (os restantes, sem contar os reprovados); progresso médio desses cursos; última atividade.
  const statsByUser = useMemo(() => {
    if (!data?.users) return new Map();
    const items = reportCourseItems(data);
    const courseIds = new Set(
      (data.courses || [])
        .filter((c) => c.status !== "draft" && courseDateState(c) === "active")
        .map((c) => c.id),
    );
    const { map } = activityByStudentCourse(data);
    const result = new Map();
    map.forEach((courses, id) => {
      let completed = 0;
      let inProgress = 0;
      let percentSum = 0;
      let count = 0;
      let last = null;
      courses.forEach((activities, idCourse) => {
        if (!courseIds.has(idCourse)) return;
        const state = reportCourseState(items.get(idCourse), activities);
        count += 1;
        if (state.completed) completed += 1;
        else if (!state.failed) inProgress += 1;
        percentSum += state.percent;
        activities.forEach((a) => {
          if (!last || dayjs(a.created_at).isAfter(last)) last = a.created_at;
        });
      });
      if (count > 0)
        result.set(id, {
          courses: count,
          completed,
          inProgress,
          average: Math.round(percentSum / count),
          last,
        });
    });
    return result;
  }, [data]);

  function filterData(values) {
    setIsSearching(true);
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
    setCurrentPage(1);
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
            <Input
              className="w-full sm:w-[260px]!"
              placeholder={t("Search for name, ID or e-mail")}
              allowClear
            />
          </Form.Item>
          <Button onClick={form.submit} type="primary" icon={<IoSearch />}>
            {t("Search")}
          </Button>
        </div>
      </Form>
      <div
        ref={listRef}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 bg-white rounded-[16px] p-4 scroll-mt-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-10">
            <Spin spinning={true} />
          </div>
        ) : filteredData.length > 0 ? (
          filteredData
            .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
            .map((u) => {
              const st = statsByUser.get(u.id);
              return (
                <Link
                  key={u.id}
                  to={`/admin/users/${u.id}`}
                  className="group block">
                  <div className="flex h-full flex-col gap-4 rounded-[16px] border border-solid border-[#E5E7EB] bg-white p-4 transition-all group-hover:border-[#163986]/40 group-hover:shadow-[0px_6px_18px_#16398614]">
                    <div className="flex items-start justify-between gap-2">
                      <UserCell
                        id={u.id}
                        name={u.name}
                        email={u.email}
                        img={u.img}
                        linkToProfile={false}
                      />
                      <LuArrowUpRight className="mt-1 shrink-0 text-[18px] text-[#C0C3CC] transition-colors group-hover:text-[#163986]" />
                    </div>

                    {u.country && (
                      <span className="flex items-center gap-1.5 text-[12px] text-[#5B5F6B]">
                        <LuMapPin className="shrink-0 text-[#8A8D98]" />{" "}
                        {t(u.country)}
                      </span>
                    )}

                    {st ? (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <Tooltip title={t("Courses with activity")}>
                            <div className="flex flex-col items-center rounded-[10px] bg-[#F6F7F9] px-2 py-2">
                              <LuBookOpen className="text-[#163986]" />
                              <span className="text-[16px] font-bold leading-tight">
                                {st.courses}
                              </span>
                              <span className="text-[10px] text-[#8A8D98]">
                                {t("Course(s)")}
                              </span>
                            </div>
                          </Tooltip>
                          <Tooltip title={t("Courses in progress")}>
                            <div className="flex flex-col items-center rounded-[10px] bg-[#E6F9FC] px-2 py-2">
                              <LuPlay className="text-[#00b9d6]" />
                              <span className="text-[16px] font-bold leading-tight">
                                {st.inProgress}
                              </span>
                              <span className="text-[10px] text-[#8A8D98]">
                                {t("In progress")}
                              </span>
                            </div>
                          </Tooltip>
                          <Tooltip title={t("Completed courses")}>
                            <div className="flex flex-col items-center rounded-[10px] bg-[#EEF7F1] px-2 py-2">
                              <LuCircleCheck className="text-[#2F8351]" />
                              <span className="text-[16px] font-bold leading-tight">
                                {st.completed}
                              </span>
                              <span className="text-[10px] text-[#8A8D98]">
                                {t("Completed")}
                              </span>
                            </div>
                          </Tooltip>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[12px]">
                            <span className="text-[#8A8D98]">
                              {t("Average progress")}
                            </span>
                            <span className="font-bold">{st.average}%</span>
                          </div>
                          <Progress
                            percent={st.average}
                            showInfo={false}
                            size="small"
                            strokeColor="#2F8351"
                            railColor="#EAEAEA"
                          />
                        </div>
                        <p className="mb-0! mt-auto text-[11px] text-[#8A8D98]">
                          {t("Last activity")}:{" "}
                          {dayjs(st.last).format("DD/MM/YYYY HH:mm")}
                        </p>
                      </>
                    ) : (
                      <div className="mt-auto rounded-[10px] bg-[#F6F7F9] px-3 py-3 text-center text-[12px] text-[#8A8D98]">
                        {t("No activity yet")}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })
        ) : (
          <div className="col-span-full">
            {isSearching ? (
              <Spin spinning={true} />
            ) : (
              <Empty
                image={
                  <IoSearch className="text-[56px] text-[#BFBFBF] mx-auto" />
                }
                styles={{ image: { height: 56 } }}
                description={t("No student found")}
              />
            )}
          </div>
        )}
      </div>
      {!isLoading && filteredData.length > PAGE_SIZE && (
        <Pagination
          // No telemóvel o total vai para uma linha própria, sem partir ("1-10 de 44")
          className="mt-4! flex flex-wrap justify-center gap-y-2 [&_.ant-pagination-total-text]:whitespace-nowrap max-sm:[&_.ant-pagination-total-text]:basis-full max-sm:[&_.ant-pagination-total-text]:text-center"
          total={filteredData.length}
          current={currentPage}
          pageSize={PAGE_SIZE}
          showSizeChanger={false}
          showTotal={(total, range) =>
            `${range[0]}-${range[1]} ${t("of")} ${total}`
          }
          onChange={(page) => {
            setCurrentPage(page);
            // Volta ao início da lista ao mudar de página
            listRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }}
        />
      )}
    </div>
  );
}
