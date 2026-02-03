import { Section } from "./section";

const FooterLink = ({ children, href }) => {
  const El = href ? "a" : "span";

  return (
    <li style={{ paddingBottom: 8 }}>
      <El
        href={href}
        style={{
          textDecoration: "none",
          fontSize: "14px",
          color: "var(--puck-color-grey-05)",
        }}
      >
        {children}
      </El>
    </li>
  );
};

const FooterList = ({ children, title }) => {
  return (
    <div>
      <h3
        style={{
          margin: 0,
          padding: 0,
          fontSize: "inherit",
          fontWeight: "600",
          color: "var(--puck-color-grey-03)",
        }}
      >
        {title}
      </h3>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          paddingTop: 12,
        }}
      >
        {children}
      </ul>
    </div>
  );
};

const Footer = ({ children }) => {
  return (
    <footer style={{ background: "var(--puck-color-grey-12)" }}>
      <h2 style={{ visibility: "hidden", height: 0, margin: 0 }}>Footer</h2>
      <div style={{ padding: 32 }}>
        <Section>
          <div
            style={{
              display: "grid",
              gridGap: 24,
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              paddingTop: 24,
              paddingBottom: 24,
            }}
          >
            {children}
          </div>
        </Section>
      </div>
    </footer>
  );
};

Footer.List = FooterList;
Footer.Link = FooterLink;

export { Footer };
