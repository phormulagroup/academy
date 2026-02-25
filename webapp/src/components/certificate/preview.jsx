import { Document, Image, Page, PDFViewer, Text, View } from "@react-pdf/renderer";
import Html from "react-pdf-html";
import config from "../../utils/config";
import { useEffect } from "react";

export default function CertificatePreview({ data }) {
  useEffect(() => {
    console.log(data);
  }, [data]);
  return (
    <div>
      <PDFViewer key={Date.now()} width="100%" height="100%" className="min-h-[500px]">
        <Document>
          <Page
            orientation="landscape"
            size="A4"
            style={{
              fontSize: 14,
              textAlign: "center",
              width: "100%",
              height: "100%",
              zoom: "50%",
              position: "relative",
            }}
          >
            <View
              style={{
                position: "relative",
                zIndex: 1,
                height: "100%",
                width: "100%",
                justifyContent: "center",
                alignItems: "flex-start",
                padding: 40,
              }}
            >
              <Image
                src={`${config.server_ip}/media/${data?.background}`}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                }}
              />
              <Html style={{ textAlign: "left" }}>{data?.text || "Text here"}</Html>
            </View>
          </Page>
        </Document>
      </PDFViewer>
    </div>
  );
}
