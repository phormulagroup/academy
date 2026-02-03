import styles from "../styles.module.css";
import { Button } from "@puckeditor/core";
import { Section } from "../../components/section";
import utils from "../../utils";

const getClassName = utils.getClassNameFactory("Hero", styles);

const Hero = ({ align, title, description, buttons, padding, image, puck }) => {
  return (
    <Section
      className={getClassName({
        left: align === "left",
        center: align === "center",
        hasImageBackground: image?.mode === "background",
      })}
      style={{ paddingTop: padding, paddingBottom: padding }}
    >
      {image?.mode === "background" && (
        <>
          <div
            className={getClassName("image")}
            style={{
              backgroundImage: `url("${image?.url}")`,
            }}
          ></div>

          <div className={getClassName("imageOverlay")}></div>
        </>
      )}

      <div className={getClassName("inner")}>
        <div className={getClassName("content")}>
          <h1>{title}</h1>
          <div className={getClassName("subtitle")}>{description}</div>
          <div className={getClassName("actions")}>
            {buttons.map((button, i) => (
              <Button key={i} href={button.href} variant={button.variant} size="large" tabIndex={puck.isEditing ? -1 : undefined}>
                {button.label}
              </Button>
            ))}
          </div>
        </div>

        {align !== "center" && image?.mode === "inline" && image?.url && (
          <div
            style={{
              backgroundImage: `url('${image?.url}')`,
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              borderRadius: 24,
              height: 356,
              marginLeft: "auto",
              width: "100%",
            }}
          />
        )}

        {align !== "center" && image?.mode === "custom" && image.content && (
          <image.content
            style={{
              height: 356,
              marginLeft: "auto",
              width: "100%",
            }}
          />
        )}
      </div>
    </Section>
  );
};

export default Hero;
