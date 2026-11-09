(() => {
  const key = typeof REVIEW_STORAGE_KEY !== "undefined" ? REVIEW_STORAGE_KEY : "qa-review-lists";
  const nav = document.querySelector(".review-nav, .nav-actions");
  if (nav) {
    const link = document.createElement("a"); link.href = "/retest-runs.html"; link.textContent = "Retest runs"; nav.append(link);
  }
  document.querySelector("[data-legacy-handoff]")?.closest("section")?.setAttribute("hidden", "");
  const notice = document.createElement("p"); notice.setAttribute("role", "status"); notice.style.cssText = "padding:8px 20px;color:#8b1b13";
  document.querySelector("main")?.prepend(notice);
  let queue = Promise.resolve();
  let failure;
  let ready = false;
  const controls = () => document.querySelectorAll("[data-review-action],[data-run-list],[data-clear-list],[data-remove-id]");
  const lock = (value) => controls().forEach((button) => { button.disabled = value; });
  async function request(url, payload) {
    const response = await fetch(url, payload === undefined ? { cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json", "X-QA-Hub": "1" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The shared retest service is unavailable.");
    return result;
  }
  function apply(state) {
    localStorage.setItem(key, JSON.stringify(state));
    window.dispatchEvent(new StorageEvent("storage", { key }));
    if (typeof updateReviewCounts === "function") updateReviewCounts();
  }
  window.qaHub = {
    sync(previous, next) {
      if (!ready) return;
      const operations = [];
      for (const id of new Set([...Object.keys(previous.retest || {}), ...Object.keys(next.retest || {})])) {
        if (JSON.stringify(previous.retest?.[id]) === JSON.stringify(next.retest?.[id])) continue;
        operations.push(next.retest?.[id] ? { id, entry: next.retest[id] } : { id, remove: true });
      }
      if (!operations.length) return;
      queue = queue.then(async () => {
        await request("/api/hub/list", { operations });
        failure = undefined; notice.textContent = "";
      }).catch((error) => { failure = error; notice.textContent = "List not saved: " + error.message + " Refresh before running a retest."; });
    },
    async flush() { await queue; if (failure) throw failure; if (!ready) throw new Error("Shared list is not connected."); },
    start: (payload) => request("/api/hub/retest", payload),
  };
  lock(true);
  request("/api/hub/list").then((state) => { apply(state); ready = true; lock(false); }).catch((error) => { notice.textContent = "Retesting unavailable: " + error.message; });
  setInterval(async () => {
    if (!ready || failure || document.hidden) return;
    await queue;
    try { apply(await request("/api/hub/list")); } catch { /* Keep the last confirmed list while offline. */ }
  }, 15000);

  const dialog = document.createElement("dialog");
  dialog.setAttribute("aria-label", "Issue evidence");
  dialog.style.cssText = "max-width:95vw;max-height:95vh;padding:16px;border:1px solid #9aa8b2;border-radius:6px";
  const close = document.createElement("button"); close.textContent = "Close"; close.onclick = () => dialog.close();
  const image = document.createElement("img"); image.alt = "Highlighted issue evidence"; image.style.cssText = "display:block;max-width:85vw;max-height:80vh;object-fit:contain;margin-top:12px";
  dialog.append(close, image); document.body.append(dialog);
  let opener;
  dialog.addEventListener("close", () => opener?.focus());
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link || !/Highlighted issue/i.test(link.textContent)) return;
    event.preventDefault(); opener = link; image.src = link.href; dialog.showModal(); close.focus();
  });
})();
