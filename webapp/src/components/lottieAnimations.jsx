import { useEffect, useRef } from "react";
import lottie from "lottie-web";

export default function LottieAnim() {
  const ref = useRef(null);

  useEffect(() => {
    const anim = lottie.loadAnimation({
      container: ref.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path: "/animation.json", // 👈 usa path!
    });

    return () => anim.destroy();
  }, []);

  return <div ref={ref} />;
}
