import { useEffect, useState } from "react";
import { Checkbox, Divider, Form } from "antd";

function ChooseColumns({ form, data, handleSubmit }) {
  const [indeterminate, setIndeterminate] = useState(false);
  const [checkAll, setCheckAll] = useState(false);

  useEffect(() => {
    if (data && data.length && data.length > 0) {
      setIndeterminate(Object.keys(data[0]).length > 0 && Object.keys(data[0]).length < form.getFieldValue("columns")?.length);
      setCheckAll(form.getFieldValue("columns")?.length === Object.keys(data[0]).length);
    }
  }, [data, form]);

  function handleCheckAll(e) {
    form.setFieldValue("columns", e.target.checked ? Object.keys(data[0]) : []);
    if (e.target.checked) setIndeterminate(false);
    setCheckAll(e.target.checked);
  }

  function handleChangeValues(e, all) {
    setIndeterminate(Object.keys(data[0]).length > 0 && Object.keys(data[0]).length < all.columns?.length ? false : true);
    setCheckAll(all.columns?.length === Object.keys(data[0]).length);
  }

  return (
    <div className="flex flex-col justify-center items-center p-2">
      <p className="font-bold blue text-[20px] mb-6 mt-6">Escolha as colunas que deseja exportar</p>
      <Form form={form} onFinish={handleSubmit} onValuesChange={handleChangeValues}>
        <Checkbox indeterminate={indeterminate} onChange={handleCheckAll} checked={checkAll}>
          Check all
        </Checkbox>
        <Divider />
        <Form.Item name="columns">
          <Checkbox.Group>
            {Object.keys(data[0]).map((item) => (
              <Checkbox value={item}>{item}</Checkbox>
            ))}
          </Checkbox.Group>
        </Form.Item>
      </Form>
    </div>
  );
}

export default ChooseColumns;
