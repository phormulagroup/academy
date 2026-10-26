import { useEffect, useRef } from "react";

// A biblioteca do Lottie (~300 KB) só é descarregada quando uma animação aparece, para não pesar no carregamento inicial da app
export default function LottieAnim(props) {
	const ref = useRef(null);

	useEffect(() => {
		let anim = null;
		let disposed = false;
		let onComplete = null;

		import("lottie-web").then(({ default: lottie }) => {
			if (disposed || !ref.current) return;
			anim = lottie.loadAnimation({
				container: ref.current,
				renderer: "svg",
				loop: props?.loop ?? true,
				autoplay: true,
				path: "/animationWithoutLoop.json", // 👈 usa path!
			});

			// Animação sem loop: avisa quando termina (ex.: para a remover da página)
			onComplete = () => props?.onComplete?.();
			anim.addEventListener("complete", onComplete);
		});

		return () => {
			disposed = true;
			if (anim) {
				anim.removeEventListener("complete", onComplete);
				anim.destroy();
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return <div ref={ref} />;
}
