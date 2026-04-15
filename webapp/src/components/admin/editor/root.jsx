import { Header } from "./components/header";
import { Footer } from "./components/footer";
import ImagePickerField from "./blocks/image/ImagePickerField";

export const Root = {
  fields: {
    title: {
      type: "text",
      label: "Page Title",
    },
    description: {
      type: "textarea",
      label: "Page Description",
    },
    heroImage: { type: "custom", label: "Imagem", render: (props) => <ImagePickerField {...props} /> },
  },
  defaultProps: {
    title: "",
    description: "",
    heroImage: "",
  },
  render: ({ puck: { isEditing, renderDropZone: DropZone } }) => {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Header editMode={isEditing} />
        <DropZone zone="default-zone" style={{ flexGrow: 1 }} />
        <Footer>
          <Footer.List title="Section">
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
          </Footer.List>
          <Footer.List title="Section">
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
          </Footer.List>
          <Footer.List title="Section">
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
          </Footer.List>
          <Footer.List title="Section">
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
          </Footer.List>
        </Footer>
      </div>
    );
  },
};

export default Root;
