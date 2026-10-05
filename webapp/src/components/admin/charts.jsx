import { Tooltip } from "antd";

// Gráficos simples do admin (dashboard, relatórios) — barras em vez de
// gráficos circulares: mais fáceis de ler e de comparar com poucas
// categorias.

// Barra empilhada horizontal (partes de um total) com legenda e percentagens.
export function StackedBar({ segments }) {
	const total = segments.reduce((sum, seg) => sum + seg.value, 0);
	return (
		<div>
			<div className="flex h-4 w-full overflow-hidden rounded-full bg-[#F0F0F0]" role="img" aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(", ")}>
				{total > 0 &&
					segments.map((seg) => (
						<Tooltip key={seg.label} title={`${seg.label}: ${seg.value} (${Math.round((seg.value * 100) / total)}%)`}>
							<div className="h-full cursor-default transition-opacity hover:opacity-80" style={{ width: `${(seg.value * 100) / total}%`, backgroundColor: seg.color }} />
						</Tooltip>
					))}
			</div>
			<div className="mt-4 flex flex-col gap-2">
				{segments.map((seg) => (
					<div key={seg.label} className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-2 min-w-0">
							<span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
							<p className="text-[12px] mb-0! truncate">{seg.label}</p>
						</div>
						<p className="text-[12px] mb-0! shrink-0">
							<span className="font-bold">{seg.value}</span> <span className="text-[#8A8D98]">({total > 0 ? Math.round((seg.value * 100) / total) : 0}%)</span>
						</p>
					</div>
				))}
			</div>
		</div>
	);
}

// Uma barra horizontal por categoria, à escala do maior valor — para
// comparar escalões.
export function HorizontalBars({ rows }) {
	const max = Math.max(1, ...rows.map((r) => r.value));
	const total = rows.reduce((sum, r) => sum + r.value, 0);
	return (
		<div className="flex flex-col gap-3">
			{rows.map((row) => (
				<div key={row.label} className="flex items-center gap-3">
					<p className="text-[12px] mb-0! w-14 shrink-0">{row.label}</p>
					<Tooltip title={`${row.label}: ${row.value} (${total > 0 ? Math.round((row.value * 100) / total) : 0}%)`}>
						<div className="h-3 flex-1 overflow-hidden rounded-full bg-[#F0F0F0]">
							<div className="h-full rounded-full" style={{ width: `${(row.value * 100) / max}%`, backgroundColor: row.color }} />
						</div>
					</Tooltip>
					<p className="text-[12px] font-bold mb-0! w-8 shrink-0 text-right">{row.value}</p>
				</div>
			))}
		</div>
	);
}

// Escalões de "Percentagem de progresso" (dashboard e relatórios): ≤ 25%,
// ≤ 50%, ≤ 75% e ≤ 100% — cada aluno cai no 1.º escalão que o inclui (quem
// concluiu o curso conta em ≤ 100%).
export const PROGRESS_BUCKETS = [25, 50, 75, 100];
export const progressBucketKey = (pct) => `≤ ${PROGRESS_BUCKETS.find((limit) => pct <= limit) ?? 100}%`;

export function emptyProgressBuckets(palette) {
	const colors = [palette.lighter, palette.light, palette.base, palette.darker];
	return Object.fromEntries(PROGRESS_BUCKETS.map((limit, i) => [`≤ ${limit}%`, { value: 0, label: `≤ ${limit}%`, color: colors[i] }]));
}
