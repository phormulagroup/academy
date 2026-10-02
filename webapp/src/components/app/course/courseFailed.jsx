import { Button, Modal } from "antd";
import { useTranslation } from "react-i18next";
import { PiXCircleDuotone } from "react-icons/pi";
import { RxChevronLeft } from "react-icons/rx";

/**
 * @component CourseFailed
 * @description Modal mostrada uma única vez, no momento em que o utilizador reprova no curso (esgotou as
 * tentativas de um teste sem aprovar). Mesma identidade da modal de curso concluído, com destaque vermelho.
 * Só tem a opção de voltar aos cursos.
 */
function CourseFailed({ open, close, courseName, userName, onBackToCourses }) {
  const { t } = useTranslation();
  return (
    <Modal
      width={520}
      centered
      open={open}
      onCancel={close}
      maskClosable={false}
      className="modal-logout modal-course-completed modal-course-failed"
      footer={[
        <Button
          key="back"
          size="large"
          icon={<RxChevronLeft />}
          className="main-secondary-cta-button"
          onClick={onBackToCourses}>
          {t("Back to courses")}
        </Button>,
      ]}>
      <div className="flex flex-col items-center text-center pt-6 sm:pt-8 px-2 sm:px-4">
        <div className="w-14 h-14 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-full bg-[#FFF5F5] border-2 border-dashed border-[#DB0709] flex items-center justify-center mb-6 sm:mb-8">
          <PiXCircleDuotone className="text-[30px] sm:text-[38px] lg:text-[44px] text-[#DB0709]" />
        </div>
        <p className="font-ryker font-black text-[#DB0709] text-[18px] sm:text-[21px] lg:text-[24px] leading-tight">
          {t("Course failed")}
        </p>
        <p className="text-[#163986] text-[12px] sm:text-[14px] lg:text-[15px] mt-4 sm:mt-5">
          {userName ? `${userName}, ` : ""}
          {t("you have used all the attempts allowed for a test without passing it in the course")}
        </p>
        <p className="font-ryker font-bold text-[#163986] text-[14px] sm:text-[16px] lg:text-[18px] mt-2 leading-snug">
          {courseName}
        </p>
      </div>
    </Modal>
  );
}

export default CourseFailed;
