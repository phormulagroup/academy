// Se o JavaScript da app não carregar (rede instável, ficheiro em falta), mostra o aviso em vez de uma página em branco.
// O aviso está dentro de #root: quando a app arranca, o React substitui-o.
window.addEventListener(
  "error",
  function (e) {
    var el = e.target;
    if (el && el.tagName === "SCRIPT") {
      var box = document.getElementById("boot-fallback");
      if (box) box.style.display = "flex";
    }
  },
  true,
);

document.addEventListener("click", function (e) {
  if (e.target && e.target.id === "boot-reload") location.reload();
});
