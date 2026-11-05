/* Daily Walk anonymous, session-only website analytics. */
(() => {
  "use strict";
  const ENDPOINT = ""; // Add the deployed Google Apps Script /exec URL after setup.
  if (!ENDPOINT) return;

  let sessionId;
  try {
    sessionId = sessionStorage.getItem("daily_walk_analytics_session");
    if (!sessionId) {
      sessionId = (crypto.randomUUID && crypto.randomUUID()) ||
        "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === "x" ? r : (r & 3 | 8)).toString(16);
        });
      sessionStorage.setItem("daily_walk_analytics_session", sessionId);
    }
  } catch (_) {
    return; // Respect browsers that disable session storage.
  }

  function send(eventName) {
    const payload = {
      event: eventName,
      source: "website",
      anonymousId: sessionId,
      page: location.pathname.slice(0, 100)
    };
    fetch(ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});
  }

  send("page_view");
  document.addEventListener("click", event => {
    const link = event.target.closest("[data-dw-event]");
    if (link) send(link.getAttribute("data-dw-event"));
  });
})();