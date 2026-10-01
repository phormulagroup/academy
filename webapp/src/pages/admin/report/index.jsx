import axios from "axios";
import { useContext, useEffect, useCallback } from "react";
import { useState } from "react";
import { Button, Tabs } from "antd";
import { RxReload } from "react-icons/rx";
import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";

import CourseReport from "./courseReport";
import TestReport from "./testReport";
import StudentProgress from "./studentProgress";
import TestProgress from "./testProgress";

export default function Report() {
	const { selectedLanguage, languages } = useContext(Context);
	const [data, setData] = useState([]); // Dados filtrados para a linguagem selecionada
	const [globalData, setGlobalData] = useState([]); // Dados globais sem filtro de linguagem
	const [products, setProducts] = useState([]);
	const [isLoading, setIsLoading] = useState(false);

	const { t } = useTranslation();

	const fetchAllData = useCallback(() => {
		const localParams = { id_lang: selectedLanguage.id };
		setIsLoading(true);

		axios
			.get(endpoints.course.report, { params: localParams })
			.then((res) => {
				setData(res.data.filtered);
				setGlobalData(res.data.global);
				console.log("Fetched data:", {
					filtered: res.data.filtered,
					global: res.data.global,
				});
			})
			.catch((err) => {
				console.error("Error fetching data:", err);
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, [selectedLanguage]);

	const getProducts = useCallback(() => {
		axios
			.get(endpoints.product.read)
			.then((res) => {
				if (res.data.length > 0) {
						setProducts(res.data.filter((p) => p.is_deleted === 0).map((p) => ({ id: p.id, name: p.name })));
				}
			})
			.catch((err) => {
				console.log(err);
			});
	}, []);

	useEffect(() => {
		fetchAllData();
		getProducts();
	}, [fetchAllData, getProducts]);

	return (
		<div className="p-2">
			<div className="flex justify-between items-center mb-4">
				<div>
					<p className="text-xl font-bold font-ryker">{t("Reports")}</p>
				</div>
				<div>
					<Button
						size="large"
						onClick={fetchAllData}
						loading={isLoading}
						icon={<RxReload />}
						className="mr-2"
					/>
				</div>
			</div>
			<div>
				<Tabs
					size="large"
					type="card"
					className="tabs-report"
					items={[
						{
							key: "1",
							label: t("Course reports"),
							forceRender: true,
							children: <CourseReport data={data} />,
						},
						{
							key: "2",
							label: t("Test reports"),
							forceRender: true,
							children: <TestReport data={data} />,
						},
					]}
				/>
			</div>
			<div className="mt-4">
				<Tabs
					size="large"
					type="card"
					className="tabs-report"
					items={[
						{
							key: "3",
							label: t("Students progress"),
							forceRender: true,
							children: <StudentProgress data={data} />,
						},
						{
							key: "4",
							label: t("Tests progress"),
							forceRender: true,
							children: <TestProgress data={globalData} products={products} languages={languages} />,
						},
					]}
				/>
			</div>
		</div>
	);
}
