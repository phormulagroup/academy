import dayjs from "dayjs";
import { useEffect, useState } from "react";

export default function Countdown({ targetDate, className, countdownType, updateCourseAvailable }) {
  const calculateTimeLeft = () => {
    let difference = dayjs(targetDate).diff(dayjs());
    if (difference <= 0) return { expired: true };

    return {
      expired: false,
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / (1000 * 60)) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.expired) {
    if (countdownType === "course") updateCourseAvailable();
    else return <p></p>;
  }

  return (
    <div style={{ marginBottom: "10px" }} className={className}>
      {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
    </div>
  );
}
