/**
 * Client-side script for AdminLayout: handles global fetch interceptor,
 * loading cursor, and submit button loading spinners.
 */

let activeFetchCount = 0;
const originalFetch = window.fetch;

window.fetch = async function (...args) {
  activeFetchCount++;
  document.body.classList.add("admin-body-loading");

  const activeElement = document.activeElement as HTMLElement | null;
  const isActionButton =
    activeElement &&
    (activeElement.tagName === "BUTTON" ||
      (activeElement.tagName === "INPUT" && (activeElement as HTMLInputElement).type === "submit"));

  if (isActionButton && activeElement && !activeElement.hasAttribute("data-no-disable")) {
    activeElement.setAttribute("disabled", "true");
    activeElement.classList.add("btn-loading");

    if (!activeElement.hasAttribute("data-original-content")) {
      activeElement.setAttribute("data-original-content", activeElement.innerHTML);
    }

    activeElement.innerHTML = `<span class="spinner"></span> ` + activeElement.innerHTML;
  }

  try {
    return await originalFetch(...args);
  } finally {
    activeFetchCount--;
    if (activeFetchCount <= 0) {
      document.body.classList.remove("admin-body-loading");
    }
    if (isActionButton && activeElement) {
      activeElement.removeAttribute("disabled");
      activeElement.classList.remove("btn-loading");
      const originalContent = activeElement.getAttribute("data-original-content");
      if (originalContent) {
        activeElement.innerHTML = originalContent;
      }
    }
  }
};
