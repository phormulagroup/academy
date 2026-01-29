import { useEffect, useRef, useState } from "react";
import { Button, Col, Row, Modal, Drawer } from "antd";
import axios from "axios";
import endpoints from "../utils/endpoints";
import Table from "./table";
import dayjs from "dayjs";

import { DiffEditor } from "@monaco-editor/react";

export default function Logs({ table, id_client, id_project, id_account, open, close }) {
  const [tableData, setTableData] = useState([]);

  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const diffEditorRef = useRef(null);

  function handleEditorDidMount(editor, monaco) {
    diffEditorRef.current = editor;
  }

  function showOriginalValue() {
    alert(diffEditorRef.current.getOriginalEditor().getValue());
  }

  function showModifiedValue() {
    alert(diffEditorRef.current.getModifiedEditor().getValue());
  }

  useEffect(() => {
    if (open && table) getData();
  }, [open === true, table, id_client, id_project, id_account]);

  function getData() {
    axios
      .get(endpoints.logs.readByParams, {
        params: { type: table, id_client: id_client, id_project: id_project, id_account: id_account },
      })
      .then((res) => {
        prepareData(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function prepareData(array) {
    const aux = [];
    for (let i = 0; i < array.length; i++) {
      aux.push({
        ...array[i],
        key: i + 1,
        date: dayjs(array[i].created_at).format("DD/MM/YYYY HH:mm:ss"),
        changed: array[i].changed ? JSON.parse(array[i].changed) : null,
        actions: null,
      });
    }

    setTableData(aux);
  }

  function onClose() {
    close();
  }

  return (
    <Drawer open={open} size={800} onClose={onClose} maskClosable={false} title="Alterações efetuadas" extra={[]}>
      <Table
        dataSource={tableData}
        loading={isLoading}
        expandable={{
          expandedRowRender: (record) => (
            <div>
              <DiffEditor
                height="400px"
                language="json"
                theme="vs-dark"
                original={JSON.stringify(record.changed.old, null, "\t")}
                modified={JSON.stringify(record.changed.new, null, "\t")}
                onMount={handleEditorDidMount}
              />
            </div>
          ),
          rowExpandable: (record) => record.changed,
        }}
        columns={[
          {
            title: "#",
            dataIndex: "key",
            key: "key",
            width: 80,
          },
          {
            title: "Ação",
            dataIndex: "action",
            key: "action",
          },
          {
            title: "Utilizador",
            dataIndex: "name",
            key: "name",
          },
          {
            title: "Data",
            dataIndex: "date",
            key: "date",
          },
          {
            title: "",
            dataIndex: "actions",
            key: "actions",
          },
        ]}
      />
    </Drawer>
  );
}
