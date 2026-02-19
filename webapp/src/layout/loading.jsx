import { useContext } from "react";
import Lottie from "lottie-react";
import bialLogoAnimation from "../assets/Bial-Academy-Logo-Animated.json";
import trailLoadingAnimation from "../assets/Trail-loading.json";
import { Context } from "../utils/context";

import { Spin } from "antd";

const Loading = () => {
  const { isLoading } = useContext(Context);

  return (
    <div className={`flex flex-col justify-center items-center w-full h-full bg-cover bg-center`}>
      <div className="max-w-150 h-[75%]">
        <Lottie animationData={bialLogoAnimation} loop={true} />
      </div>
      <div className="max-h-10!">
        <Lottie animationData={trailLoadingAnimation} loop={true} className="max-w-30" />
      </div>
    </div>
  );
};
export default Loading;
