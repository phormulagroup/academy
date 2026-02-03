import { Section } from "../../components/section";
import { withLayout } from "../../components/layout";
import styles from "../styles.module.css";
import utils from "../../utils";

const sizeOptions = [
  { value: "xxxl", label: "XXXL" },
  { value: "xxl", label: "XXL" },
  { value: "xl", label: "XL" },
  { value: "l", label: "L" },
  { value: "m", label: "M" },
  { value: "s", label: "S" },
  { value: "xs", label: "XS" },
];

const levelOptions = [
  { label: "", value: "" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
  { label: "6", value: "6" },
];

const getClassName = utils.getClassNameFactory("Heading", styles);

const HeadingInternal = {
  fields: {
    text: {
      type: "textarea",
      contentEditable: true,
    },
    size: {
      type: "select",
      options: sizeOptions,
    },
    level: {
      type: "select",
      options: levelOptions,
    },
    align: {
      type: "radio",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
  },
  defaultProps: {
    align: "left",
    text: "Heading",
    size: "m",
    layout: {
      padding: "8px",
    },
  },
  render: ({ align, text, size, level }) => {
    const Tag = level ? `h${level}` : "span";
    return (
      <Section>
        <Tag
          size={size}
          rank={level}
          className={getClassName({
            [size]: true,
          })}
        >
          <span style={{ display: "block", textAlign: align, width: "100%" }}>{text}</span>
        </Tag>
      </Section>
    );
  },
};

const Heading = withLayout(HeadingInternal);

export default Heading;
