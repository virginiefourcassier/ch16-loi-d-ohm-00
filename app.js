window.addEventListener("DOMContentLoaded", () => {
function readVoltText() {
  if (state.vMode !== "VDC") return "";
  return state.U.toFixed(2) + " V";
}

function readAmpText() {
  if (state.aMode === "OFF") return "";

  const I = I_phys(state.U, state.R); // en A

  const rangeA =
    state.aMode === "2A" ? 2 :
    state.aMode === "mA" ? 0.2 :
    0.02;

  if (I > rangeA + 1e-12) return "ERREUR";

  // Affichage avec unité cohérente selon le calibre sélectionné
  if (state.aMode === "2A") {
    return I.toFixed(2) + " A";
  }

  if (state.aMode === "mA") {
    return (I * 1000).toFixed(1) + " mA";
  }

  if (state.aMode === "uA") {
    return (I * 1_000_000).toFixed(0) + " µA";
  }

  return "";
}
});
