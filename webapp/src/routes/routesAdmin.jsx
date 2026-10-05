import { lazyPage } from "../components/lazyPage";
import { Navigate } from "react-router-dom";

const MainAdmin = lazyPage(() => import("../pages/admin/index"));
import AdminLayout from "../layout/admin";
const User = lazyPage(() => import("../pages/admin/user/index"));
const Language = lazyPage(() => import("../pages/admin/language"));
const Media = lazyPage(() => import("../pages/admin/media"));
const Iec = lazyPage(() => import("../pages/admin/iec"));
const UserGroup = lazyPage(() => import("../pages/admin/userGroup"));
const Role = lazyPage(() => import("../pages/admin/role"));

const Course = lazyPage(() => import("../pages/admin/course"));
const CourseDetails = lazyPage(() => import("../pages/admin/course/details"));

const Topic = lazyPage(() => import("../pages/admin/course/topic"));
const Test = lazyPage(() => import("../pages/admin/course/test"));
const SMTP = lazyPage(() => import("../pages/admin/email/smtp"));
const Template = lazyPage(() => import("../pages/admin/email/template"));
const TemplateDetails = lazyPage(() => import("../pages/admin/email/templateDetails"));
const TemplateEditor = lazyPage(() => import("../pages/admin/email/templateEditor"));
const Certificate = lazyPage(() => import("../pages/admin/certificate"));
const CertificateDetails = lazyPage(() => import("../pages/admin/certificate/details"));
const UserDetails = lazyPage(() => import("../pages/admin/user/details"));
const Notification = lazyPage(() => import("../pages/admin/notification"));
const Document = lazyPage(() => import("../pages/admin/document"));
const Ticket = lazyPage(() => import("../pages/admin/ticket"));
const Monitoring = lazyPage(() => import("../pages/admin/monitoring"));
const Communication = lazyPage(() => import("../pages/admin/communication/index"));
const CommunicationDetails = lazyPage(() => import("../pages/admin/communication/details"));
const CommunicationEditor = lazyPage(() => import("../pages/admin/communication/editor"));
const Report = lazyPage(() => import("../pages/admin/report"));
const Download = lazyPage(() => import("../pages/admin/download"));
const Faqs = lazyPage(() => import("../pages/admin/faqs"));
const FormSubmission = lazyPage(() => import("../pages/admin/formSubmission"));
const FormSubmissionDetails = lazyPage(() => import("../pages/admin/formSubmissionDetails"));
const Personalization = lazyPage(() => import("../pages/admin/personalization"));
const Product = lazyPage(() => import("../pages/admin/product"));

export const adminRoutes = [
	{
		path: "/admin/",
		element: <AdminLayout />,
		children: [
			{ index: true, element: <MainAdmin /> },
			{ path: "courses", element: <Course /> },
			{ path: "courses/:id", element: <CourseDetails /> },
			{ path: "courses/:id/test/:idTest", element: <Test /> },
			{ path: "reports", element: <Report /> },
			{ path: "languages", element: <Language /> },
			{ path: "smtp", element: <SMTP /> },
			{ path: "templates", element: <Template /> },
			{ path: "templates/:id", element: <TemplateDetails /> },
			{ path: "templates/:id/editor", element: <TemplateEditor /> },
			{ path: "users", element: <User /> },
			{ path: "users/:id", element: <UserDetails /> },
			{ path: "perfil", element: <UserDetails /> },
			{ path: "documents", element: <Document /> },
			{ path: "downloads", element: <Download /> },
			{ path: "media", element: <Media /> },
			{ path: "iec", element: <Iec /> },
			{ path: "user-groups", element: <UserGroup /> },
				{ path: "permissions", element: <Role /> },
			{ path: "certificate", element: <Certificate /> },
			{ path: "certificate/:id", element: <CertificateDetails /> },
			{ path: "notification", element: <Notification /> },
			{ path: "tickets", element: <Ticket /> },
			{ path: "monitoring", element: <Monitoring /> },
			{ path: "communications", element: <Communication /> },
			{ path: "communications/:id", element: <CommunicationDetails /> },
			{ path: "communications/:id/editor", element: <CommunicationEditor /> },
			{ path: "inbox", element: <Navigate to="/admin/tickets" replace /> },
			{ path: "faqs", element: <Faqs /> },
			{ path: "answers", element: <FormSubmission /> },
			{ path: "answers/:id", element: <FormSubmissionDetails /> },
			{ path: "personalization", element: <Personalization /> },
			{ path: "products", element: <Product /> },
			{ path: "*", element: <Navigate to="/admin/" replace /> },
		],
	},
	{
		path: "/admin/courses/:id/topic/:idTopic",
		element: <Topic />,
	},
];
