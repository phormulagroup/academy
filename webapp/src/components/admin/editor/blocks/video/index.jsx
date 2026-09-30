import { useState } from "react";
import Lottie from "lottie-react";
import trailLoadingAnimation from "../../../../../assets/Trail-loading.json";
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
    maxWidth: 1000, // VALORES DEFAULT DEVEM SER AJUSTADOS PARA 1000
  },
  render: (props) => <VideoPlayer {...props} />,
};

// Vídeo Vimeo 16:9 com a animação de carregamento da app até o iframe carregar
function VideoPlayer({ link, maxWidth, title, justifyContent, alignItems }) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <Section
      maxWidth={maxWidth}
      justifyContent={justifyContent}
      alignItems={alignItems}>
      <div style={{ padding: "56.25% 0 0 0", position: "relative" }}>
        {!isLoaded && (
          <div className="absolute inset-0 flex justify-center items-center bg-white">
            <Lottie
              animationData={trailLoadingAnimation}
              loop={true}
              className="max-w-24 sm:max-w-30"
            />
          </div>
        )}
        <iframe
          src={`${link}?badge=0&amp;autopause=0&amp;player_id=0`}
          frameborder="0"
          allow={`clipboard-write; encrypted-media; fullscreen`}
          referrerpolicy="strict-origin-when-cross-origin"
          allowFullscreen
          onLoad={() => setIsLoaded(true)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: isLoaded ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
          title={title}></iframe>
      </div>
      <script src="https://player.vimeo.com/api/player.js"></script>
    </Section>
  );
}

export default Video;
