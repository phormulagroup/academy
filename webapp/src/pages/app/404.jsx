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
    <div className="container mx-auto p-6 mt-10">
      <p className="text-[60px] font-[600] text-center">404</p>
      <p className="text-center">Page not found</p>
    </div>
  );
}
