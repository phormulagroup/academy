import { useContext, useEffect, useState } from "react";
import { Alert } from "antd";

import { Context } from "../../../utils/context";
import { isPowerPoint, pdfVersionExists, pdfVersionOf } from "./powerPointPdf";

// Nota mostrada por baixo do ficheiro quando é um PowerPoint, com o estado da versão PDF
export default function PowerPointPdfNote({ file }) {
	const { t } = useContext(Context);
	const [checked, setChecked] = useState({ file: null, exists: false });

	useEffect(() => {
		if (!isPowerPoint(file)) return;
		let active = true;
		pdfVersionExists(file).then((exists) => active && setChecked({ file, exists }));
		return () => {
			active = false;
		};
	}, [file]);

	if (!isPowerPoint(file)) return null;
	const pdf = pdfVersionOf(file);
	const status = checked.file !== file ? "checking" : checked.exists ? "found" : "missing";
	return (
		<Alert
			className="mb-6!"
			showIcon
			type={status === "found" ? "success" : status === "missing" ? "error" : "info"}
			message={
				status === "found"
					? `${t("PDF version found")}: ${pdf}`
					: status === "missing"
						? `${t("Missing PDF version")}: ${pdf}`
						: `${t("Checking PDF version")}: ${pdf}...`
			}
			description={
				status === "found"
					? t("The Preview in the app will show this PDF version of the PowerPoint.")
					: t("PowerPoint files need a PDF version with exactly the same name, uploaded to the Media library. Without it, the download cannot be saved.")
			}
		/>
	);
}
