// TopicRender.jsx
import { memo } from "react";
import { Render } from "@puckeditor/core";

export default memo(function TopicRender({ config, data }) {
  return <Render config={config} data={data} />;
});
