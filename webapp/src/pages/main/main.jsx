import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Collapse, Divider } from "antd";
import { FaRegUser } from "react-icons/fa";
import { useContext } from "react";
import { FaChevronRight, FaRegCheckCircle, FaRegCopy, FaRegEdit, FaRegFile, FaRegTimesCircle, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/table";
import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";

export default function Main() {
  const { user } = useContext(Context);
  const [data, setData] = useState(0);
  const [myProjects, setMyProjects] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    axios
      .get(endpoints.dashboard.read)
      .then((res) => {
        console.log(res);

        const auxMyProjects = [];
        for (let i = 0; i < res.data.projects.length; i++) {
          const aux = res.data.projects[i];
          if (aux.id_user) {
            const userList = JSON.parse(aux.id_user);
            if (userList.includes(user.id)) auxMyProjects.push(aux);
          }
        }

        setMyProjects(auxMyProjects);
        setData(res.data);
        setTableLoading(false);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  return (
    <div className="p-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex justify-between items-center p-4 bg-[#FFF] rounded-md shadow-md col-span-2">
          <div className="flex justify-center items-center">
            <Avatar className="w-20! h-20!" icon={<FaRegUser className="w-10! h-10!" />} />
            <div className="ml-4">
              <p>Olá,</p>
              <p className="text-[18px] font-semibold">{user.name}</p>
            </div>
          </div>
        </div>
        {(user.id_role === 1 || user.id_role === 2) && (
          <div className="flex justify-between items-center p-4 bg-[#FFF] rounded-md shadow-md">
            <p>Projetos</p>
            <p className="text-[30px] font-semibold">{data.projects?.length}</p>
          </div>
        )}
        {(user.id_role === 1 || user.id_role === 2) && (
          <div className="flex justify-between items-center p-4 bg-[#FFF] rounded-md shadow-md">
            <p>Contas</p>
            <p className="text-[30px] font-semibold">{data.accounts?.length}</p>
          </div>
        )}

        {myProjects.length > 0 && (
          <div className="flex flex-col col-span-2">
            <div className="flex justify-between items-center mb-4">
              <p className="text-xl font-bold">Os meus projetos</p>
              <p className="text-[30px] font-semibold">{myProjects?.length}</p>
            </div>
            <div className="flex flex-col p-4 bg-[#FFF] rounded-md shadow-md ">
              <Table
                data-tour-id="table"
                dataSource={myProjects}
                loading={tableLoading}
                expandable={{
                  showExpandColumn: user.id_role === 1 || user.id_role === 2 || user.id_role === 3 ? true : false,
                  expandedRowRender: (record) => (
                    <div className="flex flex-col">
                      <div className="grid grid-cols-4 gap-4 p-4">
                        <div className={`${record.username ? "col-span-2" : "col-span-4"} flex flex-col gap-4`}>
                          <div className="p-4 bg-[#FFF] rounded-md shadow-md">
                            <p>CPANEL</p>
                            <Divider className="mt-4! mb-4!" />
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="mb-2">Username:</p>
                                <div className="flex justify-between border-solid border-gray-300 border rounded-md px-3 py-2 items-center">
                                  <p>{record.cpanel_user ?? "---"}</p>
                                  {record.cpanel_user && <FaRegCopy className="cursor-pointer" onClick={() => onCopy(record.cpanel_user)} />}
                                </div>
                              </div>
                              <div>
                                <p className="mb-2">Password:</p>
                                <div className="flex justify-between border-solid border-gray-300 border rounded-md px-3 py-2 items-center">
                                  <p>{record.cpanel_password ?? "---"}</p>
                                  {record.cpanel_password && <FaRegCopy className="cursor-pointer" onClick={() => onCopy(record.cpanel_password)} />}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {record.username ? (
                          <div className="col-span-2 flex flex-col gap-4">
                            <div className="p-4 bg-[#FFF] rounded-md shadow-md">
                              <p>{record.type ?? "Dados"}</p>
                              <Divider className="mt-4! mb-4!" />
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="mb-2">Username:</p>
                                  <div className="flex justify-between border-solid border-gray-300 border rounded-md px-3 py-2 items-center">
                                    <p>{record.username}</p>
                                    {record.username && <FaRegCopy className="cursor-pointer" onClick={() => onCopy(record.username)} />}
                                  </div>
                                </div>
                                <div>
                                  <p className="mb-2">Password:</p>
                                  <div className="flex justify-between border-solid border-gray-300 border rounded-md px-3 py-2 items-center">
                                    <p>{record.password}</p>
                                    {record.password && <FaRegCopy className="cursor-pointer" onClick={() => onCopy(record.password)} />}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div>
                          <div className="flex flex-col p-4 bg-[#FFF] rounded-md shadow-md">
                            <div className="flex justify-between items-center">
                              <p>Cloudflare</p>
                              {record.cloudflare ? <FaRegCheckCircle color={"green"} size={18} /> : <FaRegTimesCircle color={"gray"} size={18} />}
                            </div>
                          </div>
                        </div>
                        <div className="col-span-3">
                          <div className="flex flex-col bg-[#FFF] rounded-md shadow-md">
                            <Collapse
                              bordered={false}
                              expandIcon={({ isActive }) => <FaChevronRight style={{ transform: isActive ? "rotate(90deg)" : "none" }} />}
                              style={{ background: "#FFF" }}
                              items={[
                                {
                                  key: "1",
                                  label: (
                                    <div className="flex justify-between">
                                      <p>Google</p>
                                    </div>
                                  ),
                                  children: (
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="flex flex-col p-4 bg-[#FFF] rounded-md border border-solid border-gray-300">
                                        <div className="flex justify-between items-center">
                                          <p>Site Kit</p>
                                          {record.google_site_kit ? <FaRegCheckCircle color={"green"} size={18} /> : <FaRegTimesCircle color={"gray"} size={18} />}
                                        </div>
                                      </div>
                                      <div className="flex flex-col p-4 bg-[#FFF] rounded-md border border-solid border-gray-300">
                                        <div className="flex justify-between items-center">
                                          <p>Tag Manager</p>
                                          {record.google_site_kit ? <FaRegCheckCircle color={"green"} size={18} /> : <FaRegTimesCircle color={"gray"} size={18} />}
                                        </div>
                                      </div>

                                      <div className="col-span-2 flex flex-col p-4 bg-[#FFF] rounded-md border border-solid border-gray-300">
                                        <div className="flex flex-col">
                                          <div className="flex justify-between items-center">
                                            <p>Consent</p>
                                            {record.google_consent ? <FaRegCheckCircle color={"green"} size={18} /> : <FaRegTimesCircle color={"gray"} size={18} />}
                                          </div>
                                          {record.google_consent ? (
                                            <>
                                              <Divider />
                                              <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                  <p className="mb-2">E-mail:</p>
                                                  <div className="flex justify-between border-solid border-gray-300 border rounded-md px-3 py-2 items-center">
                                                    <p>{record.google_consent_email}</p>
                                                    <FaRegCopy className="cursor-pointer" onClick={() => onCopy(record.google_consent_email)} />
                                                  </div>
                                                </div>
                                                <div>
                                                  <p className="mb-2">Password:</p>
                                                  <div className="flex justify-between border-solid border-gray-300 border rounded-md px-3 py-2 items-center">
                                                    <p>{record.google_consent_password}</p>
                                                    <FaRegCopy className="cursor-pointer" onClick={() => onCopy(record.google_consent_password)} />
                                                  </div>
                                                </div>
                                              </div>
                                            </>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>
                                  ),
                                },
                              ]}
                            />
                          </div>
                        </div>
                        {record.obs ? (
                          <div className={"col-span-4 flex flex-col gap-4"}>
                            <div className="p-4 bg-[#FFF] rounded-md shadow-md">
                              <p>Observações</p>
                              <Divider className="mt-4! mb-4!" />
                              <p>{record.obs}</p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ),
                }}
                columns={[
                  {
                    title: "Nome",
                    dataIndex: "name",
                    key: "name",
                    sort: true,
                    sortType: "text",
                    search: "name",
                  },
                  {
                    title: "Domínio",
                    dataIndex: "domain",
                    key: "domain",
                    sort: true,
                    sortType: "text",
                    search: "domain",
                  },
                  {
                    title: "Cliente",
                    dataIndex: "client_name",
                    key: "client_name",
                    filters:
                      myProjects.filter((item) => item.client_name).length > 0
                        ? myProjects
                            .map((item, index) => (item.client_name ? { text: item.client_name, value: item.client_name } : {}))
                            .filter((value, index, self) => (value.text ? index === self.findIndex((t) => t.value === value.text) : null))
                        : null,
                  },
                  {
                    title: "Responsáveis",
                    dataIndex: "responsibles",
                    key: "responsibles",
                    sort: true,
                    sortType: "text",
                    search: "responsibles",
                  },
                  {
                    title: "Tipo",
                    dataIndex: "type",
                    key: "type",
                    filters:
                      myProjects.filter((item) => item.type).length > 0
                        ? myProjects
                            .map((item, index) => (item.type ? { text: item.type, value: item.type } : {}))
                            .filter((value, index, self) => (value.text ? index === self.findIndex((t) => t.value === value.text) : null))
                        : null,
                  },
                  {
                    title: "Localização",
                    dataIndex: "location",
                    key: "location",
                    filters:
                      myProjects.filter((item) => item.location).length > 0
                        ? myProjects
                            .map((item, index) => (item.location ? { text: item.location, value: item.location } : {}))
                            .filter((value, index, self) => (value.text ? index === self.findIndex((t) => t.value === value.text) : null))
                        : null,
                  },
                  {
                    title: "Estado",
                    dataIndex: "is_deleted",
                    key: "is_deleted",
                    filters: [
                      { text: "Ativo", value: 0 },
                      { text: "Inativo", value: 1 },
                    ],
                    hidden: user.id_role === 1 || user.id_role === 2 ? false : true,
                  },
                  {
                    title: "",
                    dataIndex: "actions",
                    key: "actions",
                    hidden: user.id_role === 1 || user.id_role === 2 || user.id_role === 3 ? false : true,
                  },
                ]}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
