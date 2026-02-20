"use strict";

const uRange = document.getElementById("uRange");
const uTxt = document.getElementById("uTxt");
const rSelect = document.getElementById("rSelect");
const vRangeSel = document.getElementById("vRangeSel");
const aRangeSel = document.getElementById("aRangeSel");
const iTxt = document.getElementById("iTxt");
const iUnit = document.getElementById("iUnit");
const resetBtn = document.getElementById("resetBtn");

let U = 0;
let R = parseFloat(rSelect.value);

function compute() {
  U = parseFloat(uRange.value);
  R = parseFloat(rSelect.value);
  const I = U / R; // en ampères

  uTxt.textContent = U.toFixed(1);

  // Gestion calibre voltmètre
  const vCal = parseFloat(vRangeSel.value);
  if (U > vCal) {
    uTxt.textContent = "OL";
  }

  // Gestion calibre ampèremètre
  const aCal = parseFloat(aRangeSel.value);
  if (I > aCal) {
    iTxt.textContent = "OL";
    iUnit.textContent = "";
  } else {
    if (I < 1) {
      iTxt.textContent = (I * 1000).toFixed(1);
      iUnit.textContent = "mA";
    } else {
      iTxt.textContent = I.toFixed(3);
      iUnit.textContent = "A";
    }
  }
}

uRange.addEventListener("input", compute);
rSelect.addEventListener("change", compute);
vRangeSel.addEventListener("change", compute);
aRangeSel.addEventListener("change", compute);

resetBtn.addEventListener("click", () => {
  uRange.value = 0;
  rSelect.value = "100";
  vRangeSel.value = "20";
  aRangeSel.value = "0.2";
  compute();
});

compute();
