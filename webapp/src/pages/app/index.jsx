import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Button, Collapse, Divider } from "antd";
import { FaRegUser } from "react-icons/fa";
import { useContext } from "react";
import {
	FaChevronRight,
	FaRegCheckCircle,
	FaRegCopy,
	FaRegEdit,
	FaRegFile,
	FaRegTimesCircle,
	FaRegTrashAlt,
} from "react-icons/fa";

import Table from "../../components/admin/table";
import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../../utils/i18n";
import { Helmet } from "react-helmet";
import Lottie from "lottie-react";
import mutedVideo from "../../assets/260518-BialAcademyLogo-Animated-Paths.mp4";
import LottieAnim from "../../components/lottieAnimations";

import emergingMarket from "../../assets/Emerging-Markets.svg";

export default function Main() {
	const { user, personalization } = useContext(Context);
	const [data, setData] = useState(null);
	const navigate = useNavigate();
	const { t } = useTranslation();

	useEffect(() => {
		if (personalization?.json) {
			setData(JSON.parse(personalization.json));
		} else setData({});
	}, [personalization]);

	return (
		<div className="container mx-auto p-6 h-full">
			<Helmet>
				<meta charSet="utf-8" />
				<title>Bial Regional Academy</title>
				<meta name="description" content={`Bial Regional Academy`} />
				<meta property="og:title" content={`Bial Regional Academy`} />
				<meta property="og:description" content={`Bial Regional Academy`} />
			</Helmet>
			<div className="flex flex-col-reverse lg:grid lg:grid-cols-3 gap-10 h-full">
				<div className="flex flex-col justify-center h-full col-span-2">
					<p className="text-[30px] font-bold">
						{t("Sobre Bial Regional Academy")}
					</p>
					<p className="italic">{t("Keeping training in mind")}</p>
					{data?.text ? (
						<div
							className="homepage_text"
							dangerouslySetInnerHTML={{ __html: data.text }}
						/>
					) : (
						<div className="mt-4">
							<p>
								{t(
									"Welcome to BIAL Regional Academy, the e-learning platform!",
								)}
							</p>
						</div>
					)}
					<div className="flex justify-between items-center mt-6 w-full!">
						{Object.keys(user || {}).length === 0 && (
							<div className="flex items-center">
								<Link to={`/${i18n.language}/login`}>
									<Button type="primary" className="min-w-30" size="large">
										{t("Login")}
									</Button>
								</Link>
								<Link to={`/${i18n.language}/register`}>
									<Button className="ml-2 min-w-30" size="large">
										{t("Register")}
									</Button>
								</Link>
							</div>
						)}
						<div
							className={`flex ${Object.keys(user || {}).length === 0 ? "justify-end" : "justify-start"} items-center w-full`}
						>
							<img src={emergingMarket} className="max-w-50" />
						</div>
					</div>
				</div>

				<div className="flex justify-center items-center">
					<LottieAnim loop={false} />
				</div>
			</div>
		</div>
	);
}
