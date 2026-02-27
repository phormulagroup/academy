import axios from "axios";
import { useEffect, useState } from "react";
import { useContext } from "react";

import { Context } from "../../utils/context";
import { useNavigate } from "react-router-dom";

export default function Error404() {
  const { user, courses } = useContext(Context);

  const navigate = useNavigate();

  useEffect(() => {
    console.log(courses);
  }, [courses]);

  return (
    <div className="p-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">404</div>
      </div>
    </div>
  );
}
