import React from "react";
import { Puck } from "@puckeditor/core";
import { Button as _Button } from "antd";
import "@puckeditor/core/puck.css";

import Grid from "./blocks/grid";
import Root from "./root";
import initialData from "./initialData";
import Button from "./blocks/button";
import Card from "./blocks/card";
import Hero from "./blocks/hero";
import Heading from "./blocks/heading";
import Flex from "./blocks/flex";
import Logos from "./blocks/logos";
import Stats from "./blocks/stats";
import Text from "./blocks/text";
import { Space } from "./blocks/space";
import RichText from "./blocks/richText";
import Video from "./blocks/video";
import { PageComponent } from "./pageComponent";

const config = {
  root: Root,
  categories: {
    layout: {
      components: ["Grid", "Flex", "Space"],
    },
    typography: {
      components: ["Heading", "Text", "RichText"],
    },
    interactive: {
      title: "Actions",
      components: ["Button"],
    },
  },
  components: {
    Page: {
      render: PageComponent,
      fields: {}, // root fields já estão na config
    },
    Button,
    Card,
    Grid,
    Hero,
    Heading,
    Flex,
    Logos,
    Text,
    Space,
    RichText,
    Video,
    Stats,
  },
};

// Render Puck editor
export function Editor() {
  const save = (data) => {
    console.log(data);
  };

  return (
    <Puck
      config={config}
      data={initialData}
      onPublish={save}
      overrides={{
        headerActions: ({ children }) => (
          <>
            <div>
              <_Button newTab variant="secondary" className="mr-2!">
                View page
              </_Button>
              <_Button type="primary" onClick={save}>
                Publish
              </_Button>
            </div>
          </>
        ),
      }}
    />
  );
}
