import { Form, Row, Col, Radio, Empty, Button, Pagination, Tooltip, Input, Spin } from "antd";
import { useContext, useEffect, useState } from "react";
import { LoadingOutlined, SearchOutlined } from "@ant-design/icons";
import { FaFilePdf, FaFilePowerpoint } from "react-icons/fa";
import axios from "axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import endpoints from "../../utils/endpoints";
import config from "../../utils/config";
import { Context } from "../../utils/context";

dayjs.extend(customParseFormat);

function Library({ mediaKey, option, close }) {
  const { t } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [minValue, setMinValue] = useState(0);
  const [maxValue, setMaxValue] = useState(24);

  const [form] = Form.useForm();

  useEffect(() => {
    if (option === "library") getData();
  }, [option, mediaKey]);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.media.read)
      .then((res) => {
        setData(res.data);
        setFilteredData(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  function handleSubmit(values) {
    form.resetFields();
    close(values);
  }

  function handleChangePage(e, p) {
    setItemsPerPage(p);
    setCurrentPage(e);
    if (e <= 1) {
      setMinValue(0);
      setMaxValue(p);
    } else {
      let newMinValue = p * (e - 1);
      let newMaxValue = newMinValue + p;
      setMinValue(newMinValue);
      setMaxValue(newMaxValue);
    }
  }

  function handleSearch(e, all) {
    if (e.search) {
      const auxNewData = JSON.parse(JSON.stringify(data));
      let searchedData = auxNewData.filter((item) => item.name.toLowerCase().includes(e.search.toLowerCase()));
      setFilteredData(searchedData);
    } else {
      setFilteredData(data);
    }
  }

  return (
    <Spin spinning={isLoading} indicator={<LoadingOutlined spin />}>
      <div>
        {data.length > 0 ? (
          <Form form={form} onFinish={handleSubmit} onValuesChange={handleSearch}>
            <Form.Item name="search">
              <Input size="large" placeholder="Procure aqui pelo nome da imagem..." prefix={<SearchOutlined />} allowClear />
            </Form.Item>
            <Form.Item name={mediaKey}>
              <Radio.Group buttonStyle="solid">
                {filteredData.slice(minValue, maxValue).map((item) => {
                  return (
                    <Radio.Button value={item.name} className="radio-image">
                      <div className="flex flex-col justify-center items-center h-full">
                        {item.name.split(".")[1] === "pdf" ? (
                          <Tooltip placement="bottom" title={item.name}>
                            <FaFilePdf className="text-[40px]" />
                          </Tooltip>
                        ) : item.name.split(".")[1] === "pptx" ? (
                          <Tooltip placement="bottom" title={item.name}>
                            <FaFilePowerpoint className="text-[40px]" />
                          </Tooltip>
                        ) : (
                          <Tooltip placement="bottom" title={item.name}>
                            <img src={`${config.server_ip}/media/${item.name}`} className="w-full" />
                          </Tooltip>
                        )}
                      </div>
                    </Radio.Button>
                  );
                })}
              </Radio.Group>
            </Form.Item>
            {data.length > 0 && (
              <div className="flex justify-center items-center mt-4 w-full">
                <Pagination align="center" onChange={handleChangePage} pageSize={itemsPerPage} defaultCurrent={1} current={currentPage} total={data.length} />
              </div>
            )}
            <div className="flex justify-center items-center mt-6">
              <Button className="mr-2" onClick={() => close()}>
                {t("Cancel")}
              </Button>

              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues[mediaKey] !== currentValues[mediaKey]}>
                {({ getFieldValue }) =>
                  getFieldValue(mediaKey) && (
                    <Button type="primary" onClick={form.submit}>
                      {t("Choose")}
                    </Button>
                  )
                }
              </Form.Item>
            </div>
          </Form>
        ) : (
          <Empty className="mt-4" />
        )}
      </div>
    </Spin>
  );
}

export default Library;
