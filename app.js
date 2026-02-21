(() => {
  "use strict";

  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  const status = document.getElementById("status"); // on affiche aussi les coords ici si présent

  const bg = new Image();
  bg.src = "fond.jpg?v=11";

  let ready = false;

  function drawLabel(x, y) {
    const txt = `x:${x}  y:${y}`;

    ctx.save();

    // repère
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();

    // étiquette lisible sur fond clair (boîte noire + texte blanc)
    ctx.font = "bold 26px monospace";
    const padX = 12;
    const padY = 8;
    const w = ctx.measureText(txt).width;
    const boxW = w + 2 * padX;
    const boxH = 26 + 2 * padY;

    // position de la boîte (évite de sortir du canvas)
    let bx = x + 12;
    let by = y - boxH - 12;
    if (bx + boxW > canvas.width) bx = x - boxW - 12;
    if (by < 0) by = y + 12;

    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(bx, by, boxW, boxH);

    ctx.fillStyle = "white";
    ctx.textBaseline = "top";
    ctx.fillText(txt, bx + padX, by + padY);

    ctx.restore();
  }

  function render(x, y) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    drawLabel(x, y);

    if (status) {
      status.textContent = `Coordonnées souris (pixels sur 1280×720) : x=${x} ; y=${y}`;
    }
  }

  bg.onload = () => {
    ready = true;
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    if (status) status.textContent = "Mode mesure actif : survole l’image pour afficher x,y.";
  };

  bg.onerror = () => {
    if (status) status.textContent = "Erreur : fond.jpg non chargé.";
  };

  canvas.addEventListener("mousemove", (e) => {
    if (!ready) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * canvas.height);

    render(x, y);
  });
})();
