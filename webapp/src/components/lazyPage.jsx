import { Suspense, lazy } from "react";
import { Spin } from "antd";

// Página carregada só quando se visita (divisão do JavaScript por rota): um aluno não descarrega o backoffice e vice-versa.
// A Suspense fica em cada página, por isso o menu e o cabeçalho (layout) não desaparecem enquanto o código chega.
export function lazyPage(loader) {
	const Page = lazy(loader);
	return function LazyPage(props) {
		return (
			<Suspense
				fallback={
					<div className="flex min-h-[40vh] w-full items-center justify-center">
						<Spin size="large" />
					</div>
				}>
				<Page {...props} />
			</Suspense>
		);
	};
}
