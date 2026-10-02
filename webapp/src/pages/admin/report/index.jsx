import axios from "axios";
import RefreshButton from "../../../components/admin/refreshButton";
import { useContext, useEffect, useCallback, useMemo } from "react";
import { useState } from "react";
import { Button, Tabs } from "antd";
import { LuBookOpen, LuCircleCheck, LuFileQuestion, LuGraduationCap, LuUsers } from "react-icons/lu";
import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";

import CourseReport from "./courseReport";
import TestReport from "./testReport";
import StudentProgress from "./studentProgress";
import TestProgress from "./testProgress";

// Números-resumo do topo, calculados sobre os mesmos dados (já filtrados por idioma) que alimentam os separadores.
// "Inscrição" = par aluno+curso com atividade; "conclusão" = atividade 'course' concluída (a que liberta o certificado).
function computeSummary(data) {
	if (!data?.users) return null;
	const enrollments = new Set();
	const completed = new Set();
	let testAttempts = 0;
	let testPassed = 0;
	const activeUserIds = new Set(data.users.map((u) => u.id));
	for (const a of data.activity || []) {
		if (a.is_deleted === 1 || !activeUserIds.has(a.id_user)) continue;
		enrollments.add(`${a.id_user}-${a.id_course}`);
		if (a.activity_type === "course" && a.is_completed === 1) completed.add(`${a.id_user}-${a.id_course}`);
		if (a.activity_type === "test") {
			testAttempts += 1;
			if (a.is_completed === 1) testPassed += 1;
		}
	}
	const percent = (part, total) => (total > 0 ? `${Math.round((part * 100) / total)}%` : "—");
	return {
		courses: (data.courses || []).filter((c) => !c.is_deleted).length,
		students: data.users.filter((u) => u.id_role === 2).length,
		enrollments: enrollments.size,
		completed: completed.size,
		completionRate: percent(completed.size, enrollments.size),
		testAttempts,
		passRate: percent(testPassed, testAttempts),
	};
}

function SummaryCards({ data, isLoading }) {
	const { t } = useTranslation();
	const summary = useMemo(() => computeSummary(data), [data]);
	const value = (v) => (isLoading || !summary ? "—" : v);
	const cards = [
		{ icon: <LuBookOpen />, label: t("Courses"), value: value(summary?.courses) },
		{ icon: <LuUsers />, label: t("Students"), value: value(summary?.students) },
		{ icon: <LuGraduationCap />, label: t("Enrollments"), value: value(summary?.enrollments) },
		{ icon: <LuCircleCheck />, label: t("Completions"), value: value(summary?.completed), hint: value(summary?.completionRate) === "—" ? null : `${summary.completionRate} ${t("of enrollments")}` },
		{ icon: <LuFileQuestion />, label: t("Test attempts"), value: value(summary?.testAttempts), hint: value(summary?.passRate) === "—" ? null : `${summary.passRate} ${t("passed")}` },
	];
	return (
		<div className="flex flex-wrap lg:flex-nowrap items-stretch gap-3 mb-6">
			{cards.map((card) => (
				<div key={card.label} className="flex flex-col items-center justify-center gap-1 bg-white shadow rounded-[16px] py-4 px-4 flex-1 min-w-[140px]">
					<span className="text-[20px] text-[#163986]">{card.icon}</span>
					<p className="text-[18px] font-bold mb-0! whitespace-nowrap">{card.value}</p>
					<p className="text-[12px] text-[#8A8D98] mb-0! text-center whitespace-nowrap">{card.label}</p>
					{card.hint && <p className="text-[11px] text-[#8A8D98] mb-0! text-center whitespace-nowrap">{card.hint}</p>}
				</div>
			))}
		</div>
	);
}

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

	// Cada separador num cartão branco, como no resto do backoffice
	const card = (child) => <div className="p-4 md:p-6 bg-white shadow rounded-[16px]">{child}</div>;

	return (
		<div>
			<div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
				<p className="text-xl font-bold">{t("Reports")}</p>
				<RefreshButton onClick={fetchAllData} loading={isLoading} />
			</div>
			<SummaryCards data={data} isLoading={isLoading} />
			<Tabs
				items={[
					{ key: "1", label: t("Course reports"), forceRender: true, children: card(<CourseReport data={data} isLoading={isLoading} />) },
					{ key: "2", label: t("Students progress"), forceRender: true, children: card(<StudentProgress data={data} isLoading={isLoading} />) },
					{ key: "3", label: t("Test reports"), forceRender: true, children: card(<TestReport data={data} isLoading={isLoading} />) },
					{
						key: "4",
						label: t("Tests progress"),
						forceRender: true,
						children: card(<TestProgress data={globalData} products={products} languages={languages} />),
					},
				]}
			/>
		</div>
	);
}
