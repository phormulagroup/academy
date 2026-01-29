import { useContext, useState } from "react";
import { Button, Col, Row, Modal } from "antd";
import axios from "axios";
import endpoints from "../utils/endpoints";
import { Context } from "../utils/context";

export default function Delete({ open, close, data, table }) {
  const { messageApi, createLog } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [tablesName] = useState({ account: "Conta", client: "Cliente", project: "Project" });

  function onClose() {
    close();
  }

  async function submit() {
    try {
      setIsButtonLoading(true);
      await axios.post(endpoints[table].delete, {
        data: data,
      });
      createLog({
        action: "delete",
        type: table,
        [`id_${table}`]: data.id,
      });
      close(true);
      messageApi.success(`${tablesName[table]} foi apagado com sucesso, é considerado como inativo.`);
      setIsButtonLoading(false);
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <Modal
      key="modal-logout"
      width={400}
      style={{ top: 20 }}
      onCancel={onClose}
      open={open}
      maskClosable={false}
      footer={[
        <Button disabled={isButtonLoading} onClick={onClose}>
          Não
        </Button>,
        <Button loading={isButtonLoading} type="primary" onClick={submit}>
          Sim
        </Button>,
      ]}
    >
      <div className="p-2 pb-0">
        <p className="text-[16px] font-bold">Tem que a certeza que quer apagar?</p>
        <div className="flex flex-col mt-4">
          <p className="font-semibold">{tablesName[table]}</p>
          <p>ID: {data.id}</p>
          <p>Nome: {data.name}</p>
        </div>
      </div>
    </Modal>
  );
}
