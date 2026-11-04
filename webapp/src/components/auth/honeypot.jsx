import { Form, Input } from "antd";

// Campo isca (honeypot): escondido de quem usa o site (fora do ecrã, fora da navegação por teclado e dos leitores de ecrã). Os robôs
// preenchem-no e a API ignora esse pedido. O nome tem de coincidir com FIELD em server/utils/honeypot.js.
export default function Honeypot() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
      <Form.Item name="hp_company" label="Company" className="mb-0!">
        <Input tabIndex={-1} autoComplete="off" />
      </Form.Item>
    </div>
  );
}
