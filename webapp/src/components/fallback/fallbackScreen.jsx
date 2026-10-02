import { Button } from "antd";

import logo from "../../assets/BIAL-Regional-Academy.png";

export default function FallbackScreen({ title, text, status, actionLabel, onAction, loading }) {
  return (
    <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-6 bg-white px-6 text-center">
      <img src={logo} alt="Bial Regional Academy" className="max-w-[260px] w-full" />
      <div className="max-w-[460px]">
        <h1 className="text-2xl font-bold font-ryker m-0">{title}</h1>
        <p className="mt-3 text-base opacity-80">{text}</p>
      </div>
      <Button type="primary" size="large" className="main-cta-button" loading={loading} onClick={onAction}>
        {actionLabel}
      </Button>
      {status && <p className="text-sm opacity-60 m-0">{status}</p>}
    </div>
  );
}
