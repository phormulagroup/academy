import { Button, Modal } from "antd";
import { useTranslation } from "react-i18next";
import { PiConfettiDuotone } from "react-icons/pi";
import { AiOutlineCloudDownload } from "react-icons/ai";
import { RxChevronLeft } from "react-icons/rx";

import Confetti from "../../../utils/confetti";

/**
 * @component CourseCompleted
 * @description Modal de parabéns mostrada uma única vez, no momento em que o aluno conclui o curso.
 * Mesma identidade da modal de logout; confetes ao abrir. Permite voltar aos cursos ou descarregar o certificado.
 */
function CourseCompleted({
  open,
  close,
  courseName,
  userName,
  hasCertificate,
  onBackToCourses,
  onDownloadCertificate,
}) {
  const { t } = useTranslation();
  return (
    <>
      <Confetti active={open} />
      <Modal
        width={520}
        centered
        open={open}
        onCancel={close}
        maskClosable={false}
        className="modal-logout modal-course-completed"
        footer={[
          <Button
            key="back"
            size="large"
            icon={<RxChevronLeft />}
            className="main-secondary-cta-button"
            onClick={onBackToCourses}>
            {t("Back to courses")}
          </Button>,
          hasCertificate && (
            <Button
              key="certificate"
              size="large"
              type="primary"
              icon={<AiOutlineCloudDownload className="text-[16px] sm:text-[18px]" />}
              className="main-cta-button"
              onClick={onDownloadCertificate}>
              {t("Download certificate")}
            </Button>
          ),
        ]}>
        <div className="flex flex-col items-center text-center pt-6 sm:pt-8 px-2 sm:px-4">
          <div className="w-14 h-14 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-full bg-[#F1F9FF] border-2 border-dashed border-[#00B9D6] flex items-center justify-center mb-6 sm:mb-8">
            <PiConfettiDuotone className="text-[30px] sm:text-[38px] lg:text-[44px] text-[#00B9D6]" />
          </div>
          <p className="font-ryker font-black text-[#163986] text-[18px] sm:text-[21px] lg:text-[24px] leading-tight">
            {t("Congratulations")}, {userName}!
          </p>
          <p className="text-[#163986] text-[12px] sm:text-[14px] lg:text-[15px] mt-4 sm:mt-5">
            {t("You have successfully completed the course")}
          </p>
          <p className="font-ryker font-bold text-[#163986] text-[14px] sm:text-[16px] lg:text-[18px] mt-2 leading-snug">
            {courseName}
          </p>
        </div>
      </Modal>
    </>
  );
}

export default CourseCompleted;
