import { Switch } from "antd";
import { Section } from "../../components/section";

const Video = {
  label: "Video",
  fields: {
    link: { type: "text" },
    title: { type: "text" },
    maxWidth: { type: "number" },
    autoplay: {
      type: "custom",
      label: "Autoplay",
      render: ({ name, onChange, value }) => <Switch defaultValue={value} name={name} onChange={(e) => onChange(e.currentTarget.value)} />,
    },
  },
  defaultProps: {
    link: "https://player.vimeo.com/video/1039818823",
    maxWidth: 1400,
  },
  render: ({ link, maxWidth, title, autoplay }) => {
    return (
      <Section maxWidth={maxWidth}>
        <div style={{ padding: "56.25% 0 0 0", position: "relative" }}>
          <iframe
            src={`${link}?badge=0&amp;autopause=0&amp;player_id=0`}
            frameborder="0"
            allow={`${autoplay ?? ""}; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share`}
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
