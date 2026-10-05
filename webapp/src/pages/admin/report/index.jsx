import axios from "axios";
import RefreshButton from "../../../components/admin/refreshButton";
import { useContext, useEffect, useCallback, useMemo, useRef } from "react";
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
	// Os dados chegam por partes, só quando fazem falta (a tabela de cursos e os números do topo primeiro; cada separador pesado quando se abre)
	const [data, setData] = useState([]); // resumo do idioma: tabela de cursos e números do topo
	const [fullData, setFullData] = useState([]); // tudo do idioma: Progresso dos alunos e Relatório de testes
	const [globalData, setGlobalData] = useState([]); // tudo, de todos os idiomas: Progresso dos testes
	const [products, setProducts] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isLoadingFull, setIsLoadingFull] = useState(false);
	const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
	const [activeTab, setActiveTab] = useState("1");
	const requestRef = useRef(0);

	const { t } = useTranslation();

	const load = useCallback(
		(scope, setter, setLoading) => {
			const request = requestRef.current;
			setLoading(true);
			axios
				.get(endpoints.course.report, { params: { id_lang: selectedLanguage.id, scope } })
				.then((res) => {
					if (request !== requestRef.current) return; // o idioma mudou entretanto
					setter(scope === "global" ? res.data.global : res.data.filtered);
				})
				.catch((err) => console.error("Error fetching data:", err))
				.finally(() => request === requestRef.current && setLoading(false));
		},
		[selectedLanguage.id],
	);

	const fetchAllData = useCallback(() => {
		requestRef.current += 1;
		setFullData([]);
		setGlobalData([]);
		load("summary", setData, setIsLoading);
	}, [load]);

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

	// Dados pesados: só se pedem quando o separador que os usa está aberto (e voltam a pedir-se depois de atualizar)
	const needsFull = activeTab === "2" || activeTab === "3";
	useEffect(() => {
		if (needsFull && Object.keys(fullData).length === 0 && !isLoadingFull) load("full", setFullData, setIsLoadingFull);
	}, [needsFull, fullData, isLoadingFull, load]);
	useEffect(() => {
		if (activeTab === "4" && Object.keys(globalData).length === 0 && !isLoadingGlobal) load("global", setGlobalData, setIsLoadingGlobal);
	}, [activeTab, globalData, isLoadingGlobal, load]);

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
				activeKey={activeTab}
				onChange={setActiveTab}
				items={[
					{ key: "1", label: t("Course reports"), children: card(<CourseReport data={data} isLoading={isLoading} />) },
					{ key: "2", label: t("Students progress"), children: card(<StudentProgress data={fullData} isLoading={isLoadingFull} />) },
					{ key: "3", label: t("Test reports"), children: card(<TestReport data={fullData} isLoading={isLoadingFull} />) },
					{ key: "4", label: t("Tests progress"), children: card(<TestProgress data={globalData} products={products} languages={languages} isLoading={isLoadingGlobal} />) },
				]}
			/>
		</div>
	);
}
