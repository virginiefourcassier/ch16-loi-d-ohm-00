(() => {
  "use strict";

  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "red";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "bold 80px Arial";
  ctx.fillText("TEST OK", 200, 360);
})();
