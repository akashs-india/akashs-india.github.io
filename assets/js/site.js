// Copy buttons and language labels on code blocks, plus the 404 path echo. No dependencies.
(function () {
  document.querySelectorAll(".prose div.highlighter-rouge").forEach(function (block) {
    var m = block.className.match(/language-(\S+)/);
    if (m && m[1] !== "plaintext" && m[1] !== "text") block.setAttribute("data-lang", m[1]);
    if (!navigator.clipboard) return;
    var btn = document.createElement("button");
    btn.className = "copy";
    btn.type = "button";
    btn.textContent = "copy";
    btn.addEventListener("click", function () {
      navigator.clipboard.writeText(block.querySelector("pre").innerText).then(function () {
        btn.textContent = "copied";
        setTimeout(function () { btn.textContent = "copy"; }, 1200);
      });
    });
    block.appendChild(btn);
  });
  var p = document.querySelector("[data-path]");
  if (p) p.textContent = location.pathname;
})();
