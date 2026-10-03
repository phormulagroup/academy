import axios from "axios";
import RefreshButton from "../../components/admin/refreshButton";
import ExportButton, { activityColumn, languageColumn, createdColumn } from "../../components/admin/export/exportButton";
import { usePermission } from "../../utils/usePermission";
import { useContext, useEffect } from "react";
import RowActions from "../../components/admin/rowActions";
import { useState } from "react";
import { Button, Table as AntTable, Tag } from "antd";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { LuDownload, LuEye, LuFile } from "react-icons/lu";

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
					<img
						src={`${config.server_ip}/media/${array[i].thumbnail}`}
						alt=""
						className="h-12 w-20 rounded-md object-cover bg-[#F4F5F7]"
					/>
				),
				// Resumo dos ficheiros: o detalhe (nome, visualizações e transferências de cada um) vê-se ao expandir a linha
				items: downloadItems,
				files_count: downloadItems.length,
				views_total: downloadItems.reduce((sum, f) => sum + (Number(f.view) || 0), 0),
				downloads_total: downloadItems.reduce((sum, f) => sum + (Number(f.download) || 0), 0),
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
				tableLayout="fixed"
				scroll={{ x: 880 }}
				// Linha expandida: os ficheiros do download com as suas visualizações e transferências
				expandable={{
					rowExpandable: (record) => record.files_count > 0,
					expandedRowRender: (record) => (
						// Espaço à volta e um cartão branco: a lista de ficheiros destaca-se do fundo da linha expandida
						<div className="px-6 py-5">
							<div className="rounded-xl border border-solid border-[#E5E7EB] bg-white overflow-hidden">
								<div className="px-4 py-3 border-0 border-b border-solid border-[#F0F0F0] bg-[#FAFAFB] flex items-center justify-between gap-3">
									<span className="font-semibold text-[13px]">
										{t("Files")} ({record.items.length})
									</span>
									<span className="text-[12px] text-[#8A8D98]">
										{record.views_total} {t("Views").toLowerCase()} · {record.downloads_total} {t("Downloads").toLowerCase()}
									</span>
								</div>
								<AntTable
									size="middle"
									pagination={false}
									rowKey="id"
									dataSource={record.items}
									columns={[
										{
											title: t("File"),
											dataIndex: "name",
											key: "name",
											ellipsis: true,
											render: (name, f) => (
												<a href={`${config.server_ip}/media/${f.file}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2.5 max-w-full">
													<span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F6F7FB] text-[#163986]">
														<LuFile />
													</span>
													<span className="truncate">{name}</span>
												</a>
											),
										},
										{ title: t("Views"), dataIndex: "view", key: "view", width: 120, render: (v) => v ?? 0 },
										{ title: t("Downloads"), dataIndex: "download", key: "download", width: 140, render: (v) => v ?? 0 },
									]}
								/>
							</div>
						</div>
					),
				}}
				columns={[
					{
						title: "",
						dataIndex: "thumbnail",
						key: "thumbnail",
						width: 110,
					},
					{
						title: t("Name"),
						dataIndex: "name",
						key: "name",
						sort: true,
						sortType: "text",
						ellipsis: true,
					},
					{
						title: t("Files"),
						dataIndex: "files_count",
						key: "files_count",
						width: 110,
						render: (count) => (
							<Tag variant="outlined" color={count > 0 ? "blue" : "default"} className="m-0!">
								{count} {count === 1 ? t("file") : t("files")}
							</Tag>
						),
					},
					{
						title: t("Views"),
						dataIndex: "views_total",
						key: "views_total",
						width: 140,
						render: (v) => (
							<span className="inline-flex items-center gap-1.5 text-[#666]">
								<LuEye /> {v}
							</span>
						),
					},
					{
						title: t("Downloads"),
						dataIndex: "downloads_total",
						key: "downloads_total",
						width: 140,
						render: (v) => (
							<span className="inline-flex items-center gap-1.5 text-[#666]">
								<LuDownload /> {v}
							</span>
						),
					},
					{
						title: t("Status"),
						dataIndex: "is_deleted",
						key: "is_deleted",
						width: 110,
					},
					{
						title: "",
						dataIndex: "actions",
						key: "actions",
						width: 70,
					},
				]}
			/>
		</div>
	);
}
