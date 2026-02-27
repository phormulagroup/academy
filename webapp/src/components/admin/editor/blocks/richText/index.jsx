import { withLayout } from "../../components/layout";
import { Section } from "../../components/section";

const RichTextInner = {
  fields: {
    richtext: {
      type: "richtext",
    },
  },
  render: ({ richtext }) => {
    return <Section>{richtext}</Section>;
  },
  defaultProps: {
    richtext: "<h2>Heading</h2><p>Body</p>",
  },
};

const RichText = withLayout(RichTextInner);

export default RichText;
