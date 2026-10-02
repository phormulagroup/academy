import { useContext, useEffect, useMemo } from "react";
import { useState } from "react";
import { Button, Empty, Form, Input, Select, Spin, Tag, Tooltip } from "antd";
import { MdOutlineBook } from "react-icons/md";
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

  // Cursos em que cada aluno tem atividade (os dados que o relatório já devolve, sem pedido novo ao servidor)
  const courseCountByUser = useMemo(() => {
    const map = new Map();
    (data.activity || []).forEach((a) => {
      if (a.is_deleted === 1) return;
      if (!map.has(a.id_user)) map.set(a.id_user, new Set());
      map.get(a.id_user).add(a.id_course);
    });
    return map;
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white rounded-[5px]">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-10">
            <Spin spinning={true} />
          </div>
        ) : filteredData.length > 0 ? (
          filteredData.map((u) => (
            <Link key={u.id} to={`/admin/users/${u.id}`}>
              <div className="bg-white border border-solid border-[#D9D9D9] rounded-[15px] p-4 flex justify-between items-center gap-2">
                <UserCell id={u.id} name={u.name} email={u.email} img={u.img} linkToProfile={false} />
                <Tooltip title={t("Number of courses")}>
                  <Tag icon={<MdOutlineBook />} className="shrink-0 flex items-center gap-1!">
                    {courseCountByUser.get(u.id)?.size || 0}
                  </Tag>
                </Tooltip>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full">
            {isSearching ? <Spin spinning={true} /> : <Empty image={<IoSearch className="text-[56px] text-[#BFBFBF] mx-auto" />} styles={{ image: { height: 56 } }} description={t("No student found")} />}
          </div>
        )}
      </div>
    </div>
  );
}
