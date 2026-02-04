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
    readById: "/course/readById",
    readBySlug: "/course/readBySlug",
    readByTopicId: "/course/readByTopicId",
    readByTestId: "/course/readByTestId",
    update: "/course/update",
    updateTopic: "/course/updateTopic",
    updateProgress: "/course/updateProgress",
    module: "/course/module",
    create: "/course/create",
    delete: "/course/delete",
  },
  language: {
    read: "/language/read",
    update: "/language/update",
    create: "/language/create",
    delete: "/language/delete",
    default: "/language/default",
  },
  media: {
    read: "/media/read",
    upload: "/media/upload",
    singleUpload: "/media/singleUpload",
    update: "/media/update",
    delete: "/media/delete",
  },
};

export default endpoints;
