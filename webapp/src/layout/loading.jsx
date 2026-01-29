import { useContext } from "react";

import { Context } from "../utils/context";

import { Spin } from "antd";

const Loading = () => {
  const { isLoading } = useContext(Context);

  return (
    <div className={`flex flex-col justify-center items-center w-full h-full bg-cover bg-center`}>
      <div className="max-w-112.5 w-full min-h-75 bg-white rounded-[5px] shadow-[0px_3px_6px_#00000029]">
        <div className="flex flex-col justify-center items-center h-full p-4">
          <Spin spinning={isLoading} />
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    </div>
  );
};
export default Loading;
