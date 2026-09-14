import { useEffect, useContext } from "react";
import { Context } from "../../../utils/context";
import { Avatar, Button, Divider } from "antd";

import { useLocation } from "react-router-dom";
import avatarImg from "../../../assets/Female.svg";

export default function Card({ user, courses, scrollToResults }) {
  const { t } = useContext(Context);

  const location = useLocation();

  useEffect(() => {
    console.log(courses.progress);
  }, []);

  return (
    <div className="bg-white p-10 flex flex-col items-center">
      <p className="text-[26px] font-bold text-center">{user.name}</p>
      {user.job && <p>{user.job}</p>}
      <Avatar src={avatarImg} className="w-40! h-40! mt-4! mb-4!" />
      <p>ID</p>
      <p className="text-[25px]">{user.id}</p>
      <Button size="large" className="mt-4!" onClick={scrollToResults}>
        Resultados
      </Button>
      <div className="flex justify-center items-center gap-4 mt-6!">
        <div className="flex flex-col justify-start items-center">
          <p className="text-[40px] font-bold text-center">{courses.length}</p>
          <p className="text-[#707C87] text-sm text-center">{t("Course(s)")}</p>
        </div>
        <Divider orientation="vertical" className="m-0! h-full!" />
        <div className="flex flex-col justify-start items-center">
          <p className="text-[40px] font-bold text-center">
            {courses.map(
              (_c) =>
                _c.progress?.filter(
                  (_p) =>
                    _p.is_completed === 1 && _p.activity_type === "course",
                ).length,
            )}
          </p>
          <p className="text-[#707C87] text-sm text-center">{t("Completed")}</p>
        </div>
        <Divider orientation="vertical" className="m-0!  h-full!" />
        <div className="flex flex-col justify-start items-center">
          <p className="text-[40px] font-bold text-center">
            {courses.map(
              (_c) =>
                _c.progress?.filter(
                  (_p) =>
                    _p.is_completed === 1 && _p.activity_type === "course",
                ).length,
            )}
          </p>
          <p className="text-[#707C87] text-sm text-center">
            {t("Certificate(s)")}
          </p>
        </div>
      </div>
    </div>
  );
}
