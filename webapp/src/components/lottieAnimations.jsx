import { useEffect, useRef } from "react";
import lottie from "lottie-web";

export default function LottieAnim(props) {
	const ref = useRef(null);

	useEffect(() => {
		const anim = lottie.loadAnimation({
			container: ref.current,
			renderer: "svg",
			loop: props?.loop ?? true,
			autoplay: true,
			path: "/animationWithoutLoop.json", // 👈 usa path!
		});

		// Animação sem loop: avisa quando termina (ex.: para a remover da página)
		const onComplete = () => props?.onComplete?.();
		anim.addEventListener("complete", onComplete);

		return () => {
			anim.removeEventListener("complete", onComplete);
			anim.destroy();
		};
	}, []);

	return <div ref={ref} />;
}
