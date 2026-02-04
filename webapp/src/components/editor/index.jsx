import React, { useEffect, useRef, useState } from "react";
import { Drawer, Puck } from "@puckeditor/core";
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
import Image from "./blocks/image";
import { PageComponent } from "./pageComponent";
import { AiOutlineDrag, AiOutlineFile, AiOutlineFileImage } from "react-icons/ai";
import { CiVideoOn, CiGrid41, CiText, CiTextAlignLeft, CiImageOn } from "react-icons/ci";
import { CgDisplayFlex, CgSpaceBetweenV } from "react-icons/cg";
import { MdTitle } from "react-icons/md";
import { RxButton } from "react-icons/rx";
import { PiRectangle } from "react-icons/pi";
import { RiRectangleLine } from "react-icons/ri";

import "./style.css";
import Loading from "../../layout/loading";

export const configRender = {
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
    Image,
  },
};

export const config = {
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
    Image,
  },
};

// Render Puck editor
export function Editor({ data, submit }) {
  const [content, setContent] = useState(null);
  const latestDataRef = useRef(null);

  useEffect(() => {
    setContent(data && data.content ? JSON.parse(data.content) : initialData);
  }, [data]);

  const save = () => {
    console.log(latestDataRef.current);
    if (latestDataRef.current) submit(latestDataRef.current);
  };

  const iconsByName = {
    Flex: <CgDisplayFlex />,
    Grid: <CiGrid41 />,
    Hero: <RiRectangleLine />,
    Card: <PiRectangle />,
    Video: <CiVideoOn />,
    Heading: <CiText />,
    RichText: <CiTextAlignLeft />,
    Text: <CiTextAlignLeft />,
    Button: <RxButton />,
    Space: <CgSpaceBetweenV />,
    Image: <CiImageOn />,
  };

  function DrawerItemOverride({ name, children, ...rest }) {
    const icon = iconsByName[name] ?? <AiOutlineFile />;

    return (
      <div {...rest} className="puck-drawer-item cursor-pointer bg-[#FFF] flex flex-col justify-between items-center shadow-md rounded-[5px] p-4">
        <div className="flex flex-col justify-center items-center">
          <div className="icon-puckeditor-item">{icon}</div>
          <p className="text-[13px] mt-2">{name}</p>
        </div>
      </div>
    );
  }

  if (content) {
    return (
      <Puck
        key={JSON.stringify(content)}
        config={config}
        data={content}
        onPublish={save}
        onChange={(newData) => {
          // guardas o data sem re-renderizar a app
          latestDataRef.current = newData;
        }}
        overrides={{
          drawerItem: DrawerItemOverride,
          headerActions: ({ children }) => (
            <>
              <div className="flex justify-center items-center">
                <_Button className="mr-2!" onClick={() => console.log("go back?")}>
                  View page
                </_Button>
                <_Button onClick={() => save()} type="primary" disabled={!latestDataRef.current}>
                  Save
                </_Button>
              </div>
            </>
          ),
        }}
      />
    );
  } else {
    return <Loading />;
  }
}
