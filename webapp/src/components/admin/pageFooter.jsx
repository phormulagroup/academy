import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Rodapé fixo de uma página do admin (ex.: os botões de guardar das configurações
// e do construtor de cursos). Apresenta-se no espaço #admin-page-footer do
// layout (layout/admin.jsx), que fica POR BAIXO da área que faz scroll — não por
// cima dela, senão o conteúdo aparecia a passar por trás por causa do padding.
//
// `active`: só se mostra quando é true — páginas com vários separadores sempre
// montados (ver details.jsx) só o mostram no separador ativo.
// `className`: padding lateral, para alinhar os botões com a borda do conteúdo
// de cada página (o layout dá a cada uma um padding interno diferente).
export default function PageFooter({ active = true, className = "px-4 md:px-6", children }) {
	const [footerEl, setFooterEl] = useState(null);

	useEffect(() => {
		setFooterEl(document.getElementById("admin-page-footer"));
	}, []);

	if (!active || !footerEl) return null;

	return createPortal(
		<div className={`flex items-center gap-3 border-0 border-t border-solid border-[#E5E7EB] bg-white py-3 ${className}`}>{children}</div>,
		footerEl,
	);
}
