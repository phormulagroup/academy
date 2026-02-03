import utils from "../utils";

import styles from "./styles.module.css";

const getClassName = utils.getClassNameFactory("Header", styles);

const NavItem = ({ label, href }) => {
  const navPath = typeof window !== "undefined" ? window.location.pathname.replace("/edit", "") || "/" : "/";

  const isActive = navPath === (href.replace("/edit", "") || "/");

  const El = href ? "a" : "span";

  return (
    <El
      href={href || "/"}
      style={{
        textDecoration: "none",
        color: isActive ? "var(--puck-color-grey-02)" : "var(--puck-color-grey-06)",
        fontWeight: isActive ? "600" : "400",
      }}
    >
      {label}
    </El>
  );
};

const Header = ({ editMode }) => (
  <div className={getClassName()}>
    <header className={getClassName("inner")}>
      <div className={getClassName("logo")}>LOGO</div>
      <nav className={getClassName("items")}>
        <NavItem label="Home" href={`${editMode ? "" : "/"}`} />
        <NavItem label="Pricing" href={editMode ? "" : "/pricing"} />
        <NavItem label="About" href={editMode ? "" : "/about"} />
      </nav>
    </header>
  </div>
);

export { Header };
