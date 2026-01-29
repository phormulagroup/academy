const endpoints = {
  dashboard: {
    read: "/dashboard/read",
  },
  auth: {
    login: "/auth/login",
    loginMicrosoft: "/auth/loginMicrosoft",
    loginCode: "/auth/loginCode",
    validateEmail: "/auth/validateEmail",
    generatePassword: "/auth/generatePassword",
    verifyToken: "/auth/verifyToken",
    verifyTokenGeneratePassword: "/auth/verifyTokenGeneratePassword",
    verifyUser: "/auth/verifyUser",
  },
  import: {
    table: "/import/table",
    project: "/import/project",
    account: "/import/account",
  },
  user: {
    read: "/user/read",
    readByEmail: "/user/readByEmail",
    update: "/user/update",
    create: "/user/create",
    delete: "/user/delete",
    generatePassword: "/user/generatePassword",
  },
  course: {
    read: "/course/read",
    update: "/course/update",
    create: "/course/create",
    delete: "/course/delete",
  },
  language: {
    read: "/language/read",
    update: "/language/update",
    create: "/language/create",
    delete: "/language/delete",
  },
};

export default endpoints;
