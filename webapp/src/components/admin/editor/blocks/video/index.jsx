import { Switch } from "antd";
import { Section } from "../../components/section";

const Video = {
  label: "Video",
  fields: {
    link: { type: "text" },
    title: { type: "text" },
    maxWidth: { type: "number" },
    justifyContent: {
      label: "Justify Content",
      type: "radio",
      options: [
        { label: "Start", value: "start" },
        { label: "Center", value: "center" },
        { label: "End", value: "end" },
      ],
    },
    alignItems: {
      label: "Align Items",
      type: "radio",
      options: [
        { label: "Start", value: "start" },
        { label: "Center", value: "center" },
        { label: "End", value: "end" },
      ],
    },
  },
  defaultProps: {
    link: "https://player.vimeo.com/video/1039818823",
    maxWidth: 1400,
  },
  render: ({ link, maxWidth, title, justifyContent, alignItems }) => {
    return (
      <Section maxWidth={maxWidth} justifyContent={justifyContent} alignItems={alignItems}>
        <div style={{ padding: "56.25% 0 0 0", position: "relative" }}>
          <iframe
            src={`${link}?badge=0&amp;autopause=0&amp;player_id=0`}
            frameborder="0"
            allow={`clipboard-write; encrypted-media`}
            referrerpolicy="strict-origin-when-cross-origin"
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
            title={title}
          ></iframe>
        </div>
        <script src="https://player.vimeo.com/api/player.js"></script>
      </Section>
    );
  },
};

export default Video;
