import React from "react";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import config from "./config";

// Render Puck editor
export function Editor() {
  // Create Puck component config

  // Describe the initial data
  const initialData = {};

  // Save the data to your database
  const save = (data) => {
    console.log(data);
  };

  return <Puck config={config} data={initialData} onPublish={save} />;
}
