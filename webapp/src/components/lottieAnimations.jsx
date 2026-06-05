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
			path: "/animation.json", // 👈 usa path!
		});

		return () => anim.destroy();
	}, []);

	return <div ref={ref} />;
}
