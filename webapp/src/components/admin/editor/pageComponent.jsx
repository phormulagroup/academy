export function PageComponent({ title, description, heroImage, theme, seo, children }) {
  return (
    <div className={theme === "dark" ? "dark" : "light"}>
      {heroImage && <img src={heroImage} alt={title} style={{ width: "100%" }} />}

      <h1>{title}</h1>

      {description && <p>{description}</p>}

      {/* Render the page content blocks */}
      <div>{children}</div>

      {/* SEO (só para exemplo, podes adaptar) */}
      <footer style={{ marginTop: "40px" }}>
        <strong>SEO Preview:</strong>
        <p>
          <b>Title:</b> {seo?.metaTitle}
        </p>
        <p>
          <b>Description:</b> {seo?.metaDescription}
        </p>
      </footer>
    </div>
  );
}
