import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Button, Collapse, Divider } from "antd";
import { FaRegUser } from "react-icons/fa";
import { useContext, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AiOutlineArrowLeft } from "react-icons/ai";
import DocViewer, { DocViewerRenderers } from "react-doc-viewer";
import {
	PDFViewer,
	ScrollStrategy,
	ZoomMode,
} from "@embedpdf/react-pdf-viewer";
import { Helmet } from "react-helmet";
import Lottie from "lottie-react";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import trailLoadingAnimation from "../../../assets/Trail-loading.json";
import { useNavigate, useParams } from "react-router-dom";
import i18n from "../../../utils/i18n";

import config from "../../../utils/config";

export default function DocumentDetails({ themePreference = "light" }) {
	const { user, courses, languages } = useContext(Context);
	const [isLoading, setIsLoading] = useState(true);
	const [data, setData] = useState(null);
	const [pdfUrl, setPdfUrl] = useState(null);

	const viewerRef = useRef(null);

	const navigate = useNavigate();
	const { slug } = useParams();
	const { t } = useTranslation();

	useEffect(() => {
		getData();
	}, []);

	// Update theme when preference changes
	useEffect(() => {
		viewerRef.current?.container?.setTheme({ preference: themePreference });
	}, [themePreference]);

	function getData() {
		axios
			.get(endpoints.document.readBySlug, {
				params: {
					slug,
					id_lang: languages.filter((l) => l.code === i18n.language)[0].id,
				},
			})
			.then(async (res) => {
				if (res.data.length > 0) {
					let item = res.data[0];
					item.country = item.country ? JSON.parse(item.country) : null;

					if (item.country && !item.country.includes(user.country)) {
						setData(null);
						setIsLoading(false);
						return;
					}
					const file = await axios.get(endpoints.document.readFile, {
						params: { file: item.file },
						responseType: "blob", // 👈 MUITO IMPORTANTE
					});

					const blobUrl = URL.createObjectURL(file.data);

					setData(res.data[0] || null);
					setPdfUrl(blobUrl);
				}
				setIsLoading(false);
			})
			.catch((err) => {
				console.log(err);
			});
	}

	return (
		<div className="container mx-auto p-6">
			{isLoading ? (
				<div className="flex justify-center items-center w-full h-full col-span-3">
					<Lottie
						animationData={trailLoadingAnimation}
						loop={true}
						className="max-w-30"
					/>
				</div>
			) : data ? (
				<div>
					<Helmet>
						<meta charSet="utf-8" />
						<title>{data.name} - Bial Regional Academy</title>
						<meta
							name="description"
							content={`${data.name} - Bial Regional Academy`}
						/>
						<meta
							property="og:title"
							content={`${data.name} - Bial Regional Academy`}
						/>
						<meta
							property="og:description"
							content={`${data.name} - Bial Regional Academy`}
						/>
					</Helmet>
					<div className="flex justify-between items-center mb-4">
						<p className="text-[24px] font-bold">{data?.name}</p>
						<Button
							size="large"
							type="text"
							icon={<AiOutlineArrowLeft />}
							onClick={() =>
								navigate(`/${i18n.language}/documents`, { replace: true })
							}
						>
							{t("Back to documents")}
						</Button>
					</div>
					<div
						className="max-w-300 h-175 w-full overflow-hidden mx-auto"
						ref={viewerRef}
					>
						<PDFViewer
							key={data.id}
							config={{
								src: pdfUrl,
								zoom: {
									defaultZoomLevel: ZoomMode.FitWidth, // or a number like 1.5
								},
								scroll: {
									defaultStrategy: ScrollStrategy.Horizontal, // or ScrollStrategy.Horizontal
									defaultPageGap: 5,
								},

								// Esconder TODA a UI
								disabledCategories: [
									"annotation",
									"panel-search",
									"panel-comment",
									"document",
									"form",
									"insert",
									"redaction",
								],

								theme: {
									preference: "light",
								},
							}}
							style={{ width: "100%", height: "100%" }}
						/>
					</div>
				</div>
			) : (
				<div>
					<Helmet>
						<meta charSet="utf-8" />
						<title>Document not found - Bial Regional Academy</title>
						<meta
							name="description"
							content={`Document not found - Bial Regional Academy`}
						/>
						<meta
							property="og:title"
							content={`Document not found} - Bial Regional Academy`}
						/>
						<meta
							property="og:description"
							content={`Document not found - Bial Regional Academy`}
						/>
					</Helmet>
					<p>{t("Document not found")}</p>
				</div>
			)}
		</div>
	);
}
