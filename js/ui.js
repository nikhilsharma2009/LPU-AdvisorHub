export function toast(message, type = "success") {
  let region = document.querySelector("#toast-region");
  if (!region) { region = document.createElement("div"); region.id = "toast-region"; region.className = "toast-region"; region.setAttribute("aria-live", "polite"); document.body.append(region); }
  const item = document.createElement("div");
  item.className = `toast toast-${type}`; item.textContent = message;
  region.append(item); setTimeout(() => item.remove(), 3800);
}
export function modal({ title, body, confirmText = "Confirm", danger = false, confirmClass, onConfirm }) {
  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop"; wrap.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="icon-button modal-close" type="button" aria-label="Close dialog">×</button><h2 id="modal-title"></h2><div class="modal-body"></div><div class="button-row"><button type="button" class="button button-secondary modal-cancel">Cancel</button><button type="button" class="button ${danger ? "button-danger" : confirmClass || "button-primary"} modal-confirm"></button></div></section>`;
  wrap.querySelector("h2").textContent = title; wrap.querySelector(".modal-body").append(body instanceof Node ? body : Object.assign(document.createElement("p"), { textContent: body }));
  wrap.querySelector(".modal-confirm").textContent = confirmText;
  const close = () => { wrap.remove(); document.removeEventListener("keydown", keydown); };
  const keydown = event => { if (event.key === "Escape") close(); };
  wrap.querySelector(".modal-close").onclick = close; wrap.querySelector(".modal-cancel").onclick = close; wrap.addEventListener("click", event => { if (event.target === wrap) close(); });
  wrap.querySelector(".modal-confirm").onclick = () => { if (onConfirm) onConfirm(); close(); };
  document.addEventListener("keydown", keydown); document.body.append(wrap); wrap.querySelector(".modal-confirm").focus();
  return close;
}
export function fieldError(input, message) {
  const field = input.closest(".field"); if (!field) return;
  let error = field.querySelector(".field-error");
  if (!error) { error = document.createElement("small"); error.className = "field-error"; field.append(error); }
  error.textContent = message || ""; input.setAttribute("aria-invalid", message ? "true" : "false");
}
