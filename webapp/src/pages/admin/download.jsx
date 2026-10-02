import axios from "axios";
import RefreshButton from "../../components/admin/refreshButton";
import ExportButton, { activityColumn, languageColumn, createdColumn } from "../../components/admin/export/exportButton";
import { usePermission } from "../../utils/usePermission";
import { useContext, useEffect } from "react";
import RowActions from "../../components/admin/rowActions";
import { useState } from "react";
import { Button } from "antd";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/admin/table";
import useListFilters, { includesText } from "../../components/admin/listFilters";
import Create from "../../components/admin/download/create";
import Update from "../../components/admin/download/update";
import Delete from "../../components/admin/delete";
import StatusTag from "../../utils/statusTag";
import { uniqueRule } from "../../utils/formFieldError";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { AiOutlinePlus } from "react-icons/ai";
import { useTranslation } from "react-i18next";
import config from "../../utils/config";
import { Link } from "react-router-dom";

export default function Download() {
	const { user, selectedLanguage } = useContext(Context);
	const { t } = useTranslation();
	const perm = usePermission("download");
	const [isLoading, setIsLoading] = useState(true);
	const [data, setData] = useState([]);
	const [items, setItems] = useState([]);
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
			.get(endpoints.download.readByLang, {
				// O backoffice lista também os downloads inativos (apagados)
				params: { id_lang: selectedLanguage.id, include_deleted: 1 },
			})
			.then((res) => {
				let downloads = res.data[0];
				let downloadItems = res.data[1];
				let aux = [];

				for (let i = 0; i < downloads.length; i++) {
					downloads[i].country = downloads[i].country
						? JSON.parse(downloads[i].country)
						: null;
					aux.push({
						name: downloads[i].name,
						thumbnail: downloads[i].thumbnail,
						banner: downloads[i].banner,
						files: downloadItems.filter(
							(d) => d.id_download === downloads[i].id,
						).length,
					});
				}
				setData(downloads);
				setItems(downloadItems);
				prepareData(downloads, downloadItems);
				setIsLoading(false);
			})
			.catch((err) => {
				console.log(err);
				setIsLoading(false);
			});
	}

	function prepareData(array, items) {
		const aux = [];
		for (let i = 0; i < array.length; i++) {
			let downloadItems = items.filter((d) => d.id_download === array[i].id);
			aux.push({
				...array[i],
				key: i + 1,
				thumbnail: (
					<div className="flex justify-start items-center">
						<img
							src={`${config.server_ip}/media/${array[i].thumbnail}`}
							className="max-w-25 h-auto"
						/>
					</div>
				),
				files:
					downloadItems.length > 0
						? downloadItems.map((f, i) => (
								<div className="flex flex-col justify-center items-start gap-2">
									<Link
										to={`${config.server_ip}/media/${f.file}`}
										target="_blank"
										className="underline!"
									>
										<p>{f.name}</p>
									</Link>
									<div className="mb-4">
										<p className="text-[12px]">
											{t("Views")}: {f.view}
										</p>
										<p className="text-[12px]">
											{t("Downloads")}: {f.download}
										</p>
									</div>
								</div>
							))
						: 0,
				is_deleted: <StatusTag isDeleted={array[i].is_deleted} />,
				full_data: array[i],
				actions: (
					<div className="flex justify-end items-center">
						<RowActions items={[
									perm.canUpdate && {
										label: t("Update"),
										key: `${array[i].id}-udpate`,
										icon: <FaRegEdit />,
										onClick: () =>
											openUpdate({ ...array[i], items: downloadItems }),
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

	// Nome único (usado pelo Create e pelo Update): não pode existir outro download ativo neste idioma
	// com o mesmo nome; no Update ignora o próprio download (excludeId)
	const nameRule = (excludeId = null) =>
		uniqueRule(data, t("A download with this name already exists"), { excludeId });

	function closeAction(c) {
		if (c) {
			getData();
		}
		setIsOpenUpdate(false);
		setIsOpenCreate(false);
		setIsOpenDelete(false);
	}

  // Pesquisa e filtros fora da tabela: campos à vista e os restantes em "Mais filtros"
  const { filterRows, toolbar } = useListFilters([
    { key: "name", type: "text", primary: true, placeholder: t("Search by name..."), match: (row, v) => includesText(row.full_data.name, v) },
    { key: "status", type: "select", primary: true, label: t("Status"), options: [{ label: t("Active"), value: 0 }, { label: t("Inactive"), value: 1 }], match: (row, v) => row.full_data.is_deleted === v },
  ]);

	return (
		<div className="p-2">
			<Create open={isOpenCreate} close={closeAction} nameRule={nameRule} />
			<Update data={selectedData} open={isOpenUpdate} close={closeAction} nameRule={nameRule} />
			<Delete
				data={selectedData}
				open={isOpenDelete}
				close={closeAction}
				table="download"
			/>
			<div className="flex justify-between items-center mb-4 flex-wrap gap-3">
				<div>
					<p className="text-xl font-bold font-ryker">{t("Downloads")}</p>
					<p className="text-[#8A8D98] text-[14px] mb-0!">{t("{{total}} downloads", { total: filterRows(tableData).length })}</p>
				</div>
				<div className="flex flex-wrap items-center justify-end gap-2">
				  {toolbar}
					<ExportButton table="downloads" data={filterRows(tableData).map((r) => r.full_data)} columns={[{ title: "ID", dataIndex: "id" }, { title: "Name", dataIndex: "name" }, { title: "Slug", dataIndex: "slug" }, languageColumn, { title: "Country", dataIndex: "country" }, activityColumn, createdColumn]} />
					<RefreshButton size="large" onClick={getData} />
					{perm.canCreate && (<Button
						size="large"
						onClick={() => setIsOpenCreate(true)}
						icon={<AiOutlinePlus />}
					>
						{t("Add download")}
					</Button>)}
				</div>
			</div>
			<Table
				dataSource={filterRows(tableData)}
				loading={isLoading}
				columns={[
					{
						title: "",
						dataIndex: "thumbnail",
						key: "thumbnail",
						width: "100px",
					},
					{
						title: t("Name"),
						dataIndex: "name",
						key: "name",
						sort: true,
						sortType: "text",
						width: "35%",
					},
					{
						title: t("File"),
						dataIndex: "files",
						key: "files",
						width: "45%",
					},
					{
						title: t("Status"),
						dataIndex: "is_deleted",
						key: "is_deleted",
						width: "150px",
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
