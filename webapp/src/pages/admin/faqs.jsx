import axios from "axios";
import { usePermission } from "../../utils/usePermission";
import { useContext, useEffect } from "react";
import RowActions from "../../components/admin/rowActions";
import { useState } from "react";
import { Button, Image, Tag } from "antd";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/admin/table";
import useListFilters, { includesText } from "../../components/admin/listFilters";
import Create from "../../components/admin/faqs/create";
import Update from "../../components/admin/faqs/update";
import Delete from "../../components/admin/delete";
import { uniqueRule } from "../../utils/formFieldError";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { AiOutlinePlus } from "react-icons/ai";
import { useTranslation } from "react-i18next";
import { RxReload } from "react-icons/rx";
import config from "../../utils/config";
import i18n from "../../utils/i18n";

export default function Faqs() {
  const { user, selectedLanguage } = useContext(Context);
  const { t } = useTranslation();
  const perm = usePermission("faqs");
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenUpdate, setIsOpenUpdate] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenTranslations, setIsOpenTranslations] = useState(false);

  useEffect(() => {
    getData();
  }, [selectedLanguage]);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.faqs.readByLang, { params: { id_lang: selectedLanguage.id } })
      .then((res) => {
        setData(res.data);
        prepareData(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  function prepareData(array) {
    const aux = [];
    for (let i = 0; i < array.length; i++) {
      let images = array[i].images ? JSON.parse(array[i].images) : [];

      aux.push({
        ...array[i],
        key: i + 1,
        description: <div dangerouslySetInnerHTML={{ __html: array[i].description }} />,
        images:
          images.length > 0 ? (
            <div className="flex justify-start items-center gap-4">
              {images.map((item) => (
                <Image
                  width={100}
                  alt={item.img}
                  src={`${config.server_ip}/media/${item.img}`}
                  preview={{
                    mask: { blur: true },
                  }}
                />
              ))}
            </div>
          ) : null,
        full_data: array[i],
        actions: (
          <div className="flex justify-end items-center">
            <RowActions items={[
                  perm.canUpdate && {
                    label: t("Update"),
                    key: `${array[i].id}-udpate`,
                    icon: <FaRegEdit />,
                    onClick: () => openUpdate(array[i]),
                  },
                  perm.canDelete && {
                    label: t("Delete"),
                    key: `${array[i].id}-delete`,
                    icon: <FaRegTrashAlt />,
                    onClick: () => openDelete(array[i]),
                  },
                ]} />
          </div>
        ),
      });
    }

    setTableData(aux);
  }

  function openUpdate(obj) {
    setSelectedData(obj);
    setIsOpenUpdate(true);
  }

  function openDelete(obj) {
    setSelectedData(obj);
    setIsOpenDelete(true);
  }

  function closeAction(c) {
    if (c) {
      getData();
    }
    setIsOpenUpdate(false);
    setIsOpenCreate(false);
    setIsOpenDelete(false);
  }

  // Título único (usado pelo Create e pelo Update): não pode existir outra FAQ ativa neste idioma com o
  // mesmo título; no Update ignora a própria FAQ (excludeId)
  const nameRule = (excludeId = null) =>
    uniqueRule(data, t("A faq with this title already exists"), { field: "title", excludeId });

  // Pesquisa e filtros fora da tabela: campos à vista e os restantes em "Mais filtros"
  const { filterRows, toolbar } = useListFilters([
    { key: "title", type: "text", primary: true, placeholder: t("Search by title..."), match: (row, v) => includesText(row.full_data.title, v) },
  ]);

  return (
    <div className="p-2">
      <Create open={isOpenCreate} close={closeAction} nameRule={nameRule} />
      <Update data={selectedData} open={isOpenUpdate} close={closeAction} nameRule={nameRule} />
      <Delete data={selectedData} open={isOpenDelete} close={closeAction} table="faqs" />
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <p className="text-xl font-bold font-ryker">{t("Faqs")}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {toolbar}
          <Button size="large" onClick={getData} icon={<RxReload />} />
          {perm.canCreate && (<Button size="large" onClick={() => setIsOpenCreate(true)} icon={<AiOutlinePlus />}>
            {t("Add faq")}
          </Button>)}
        </div>
      </div>
      <Table
        dataSource={filterRows(tableData)}
        loading={isLoading}
        columns={[
          {
            title: t("Title"),
            dataIndex: "title",
            key: "title",
            sort: true,
            sortType: "text",
            width: "400px",
          },
          {
            title: t("Description"),
            dataIndex: "description",
            key: "description",
          },
          {
            title: t("Images"),
            dataIndex: "images",
            key: "images",
          },
          {
            title: "",
            dataIndex: "actions",
            key: "actions",
            width: "80px",
          },
        ]}
      />
    </div>
  );
}
