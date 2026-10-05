import { lazyPage } from "../components/lazyPage";
import { Navigate } from "react-router-dom";

import MainLayout from "../layout/main";
const Main = lazyPage(() => import("../pages/app"));
const Course = lazyPage(() => import("../pages/app/course"));
const CourseDetails = lazyPage(() => import("../pages/app/course/details"));
const Learning = lazyPage(() => import("../pages/app/course/eLearning"));
const Account = lazyPage(() => import("../pages/app/account"));
const Result = lazyPage(() => import("../pages/app/results"));
const Notifications = lazyPage(() => import("../pages/app/notification"));
const Ticket = lazyPage(() => import("../pages/app/ticket"));
const Document = lazyPage(() => import("../pages/app/document"));
const DocumentDetails = lazyPage(() => import("../pages/app/document/details"));
const Error404 = lazyPage(() => import("../pages/app/404"));
const Download = lazyPage(() => import("../pages/app/download"));
const DownloadDetails = lazyPage(() => import("../pages/app/download/details"));
const Faqs = lazyPage(() => import("../pages/app/faqs"));
const Contact = lazyPage(() => import("../pages/app/contact"));

export const userRoutes = [
	// Com layout principal
	{
		element: <MainLayout />,
		children: [
			{ index: true, element: <Course /> }, // "/:lang"
			{ path: "account", element: <Account /> }, // "/:lang/courses"
			{ path: "result", element: <Result /> }, // "/:lang/courses"
			{ path: "about", element: <Main /> }, // "/:lang/courses"
			{ path: "documents", element: <Document /> }, // "/:lang/courses"
			{ path: "documents/:slug", element: <DocumentDetails /> }, // "/:lang/courses"
			{ path: "downloads", element: <Download /> }, // "/:lang/courses"
			{ path: "downloads/:slug", element: <DownloadDetails /> }, // "/:lang/courses"
			{ path: "faqs", element: <Faqs /> }, // "/:lang/faqs"
			{ path: "notifications", element: <Notifications /> }, // "/:lang/notifications"
			{ path: "tickets", element: <Ticket /> }, // "/:lang/tickets"
			{ path: "inbox", element: <Navigate to="../tickets" replace relative="path" /> },
			{ path: "contact", element: <Contact /> }, // "/:lang/contact"
			{ path: "courses", element: <Course /> }, // "/:lang/courses"
			{ path: "courses/:slug", element: <CourseDetails /> }, // "/:lang/courses/:slug"
			{ path: "*", element: <Error404 /> }, // Errro 404 para rotas não encontradas dentro do layout, mantendo :lang
		],
	},
	// Fora do MainLayout, mas ainda dentro de :lang
	{ path: "courses/:slug/learning", element: <Learning /> }, // "/:lang/courses/:slug/learning"
];
