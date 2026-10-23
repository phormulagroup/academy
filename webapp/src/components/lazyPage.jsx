import { Suspense, lazy } from "react";
import { Spin } from "antd";

// Página carregada só quando se visita (divisão do JavaScript por rota): um aluno não descarrega o backoffice e vice-versa.
// A Suspense fica em cada página, por isso o menu e o cabeçalho (layout) não desaparecem enquanto o código chega.
// preload: começa a descarregar logo ao arrancar a app (durante o ecrã de carregamento da plataforma), para a página já estar pronta
// quando esse ecrã termina e não aparecer um segundo spinner (login, registo, recuperar password).
export function lazyPage(loader, { preload = false } = {}) {
	if (preload) loader();
	const Page = lazy(loader);
	return function LazyPage(props) {
		return (
			<Suspense
				fallback={
					preload ? null : (
						<div className="flex min-h-[40vh] w-full items-center justify-center">
							<Spin size="large" />
						</div>
					)
				}>
				<Page {...props} />
			</Suspense>
		);
	};
}
