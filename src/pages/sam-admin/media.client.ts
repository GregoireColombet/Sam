import { formatBytes } from "@/lib/utils";
import { apiRequest } from "@/lib/client-utils";

const fileInput = document.getElementById("media-file-input") as HTMLInputElement | null;
const tabBtns = document.querySelectorAll(".tab-btn");
const tabPanes = document.querySelectorAll(".tab-pane");

// Tab switching
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-tab");
    if (!target) return;

    tabBtns.forEach((b) => b.classList.remove("active"));
    tabPanes.forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(`tab-${target}`)?.classList.add("active");

    if (fileInput) {
      if (target === "pictures") {
        fileInput.setAttribute("accept", "image/png, image/jpeg, image/webp");
      } else {
        fileInput.setAttribute("accept", "video/mp4, video/webm, video/ogg, video/quicktime");
      }
    }
  });
});

// Upload file
async function uploadFile(file: File) {
  if (!file) return;

  const btn = document.querySelector(".upload-btn") as HTMLElement | null;
  const originalText = btn ? btn.textContent : "Upload File";
  if (btn) {
    btn.textContent = "Uploading...";
    btn.style.opacity = "0.7";
    btn.style.pointerEvents = "none";
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("alt", file.name.split(".")[0]);

  try {
    const data = await apiRequest("/sam-admin/api/media/upload", {
      method: "POST",
      body: formData
    });

    const isVideo = file.type.startsWith("video/");
    const targetGridId = isVideo ? "videos-grid" : "pictures-grid";
    const targetEmptyMsgId = isVideo ? "empty-videos-msg" : "empty-pictures-msg";

    const grid = document.getElementById(targetGridId);
    const emptyMsg = document.getElementById(targetEmptyMsgId);
    if (emptyMsg) emptyMsg.remove();

    const card = document.createElement("div");
    card.className = "media-card";
    card.setAttribute("data-asset-id", data.id);

    const previewHtml = isVideo
      ? `<video src="${data.url}" muted preload="metadata" controls style="max-width: 100%; max-height: 100%; object-fit: contain;"></video>`
      : `<img src="${data.url}" alt="${file.name}" />`;

    card.innerHTML = `
      <div class="media-preview">
        ${previewHtml}
      </div>
      <div class="media-details">
        <strong class="media-name" title="${file.name}">${file.name}</strong>
        <span class="media-meta">${formatBytes(file.size)} · ${file.type.split("/")[1].toUpperCase()}</span>
        <input type="text" class="media-url-input" readonly value="${data.url}" title="Click to copy URL" />
        <button class="delete-btn" data-id="${data.id}">Delete</button>
      </div>
    `;

    const input = card.querySelector(".media-url-input") as HTMLInputElement;
    input.addEventListener("click", () => {
      input.select();
      navigator.clipboard.writeText(input.value);
      alert("URL copied to clipboard!");
    });

    card.querySelector(".delete-btn")?.addEventListener("click", () => handleDelete(data.id, file.name, isVideo));

    if (grid) {
      grid.insertBefore(card, grid.firstChild);
    }
  } catch (e: any) {
    alert("Error: " + e.message);
  } finally {
    if (btn) {
      btn.textContent = originalText;
      btn.style.opacity = "";
      btn.style.pointerEvents = "";
    }
    if (fileInput) fileInput.value = "";
  }
}

// Delete file
async function handleDelete(id: number, name: string, isVideo: boolean) {
  if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

  try {
    await apiRequest("/sam-admin/api/media/delete", {
      method: "POST",
      body: JSON.stringify({ id })
    });

    const card = document.querySelector(`[data-asset-id="${id}"]`);
    card?.remove();

    const gridId = isVideo ? "videos-grid" : "pictures-grid";
    const emptyMsgId = isVideo ? "empty-videos-msg" : "empty-pictures-msg";
    const grid = document.getElementById(gridId);

    if (grid && grid.children.length === 0) {
      const msg = document.createElement("div");
      msg.className = "empty-media";
      msg.id = emptyMsgId;
      msg.textContent = isVideo ? "No videos uploaded yet." : "No pictures uploaded yet.";
      grid.appendChild(msg);
    }
  } catch (e: any) {
    alert("Error: " + e.message);
  }
}

// File input change
fileInput?.addEventListener("change", () => {
  const files = fileInput.files;
  if (files && files.length > 0) {
    uploadFile(files[0]);
  }
});

// Bind server-rendered delete buttons
document.querySelectorAll(".delete-btn").forEach((btn) => {
  const id = Number(btn.getAttribute("data-id"));
  const name = btn.closest(".media-card")?.querySelector(".media-name")?.textContent || "this asset";
  const isVideo = btn.closest(".media-card")?.querySelector("video") !== null;
  btn.addEventListener("click", () => handleDelete(id, name, isVideo));
});

// Copy to clipboard for existing cards
document.querySelectorAll(".media-url-input").forEach((input) => {
  const textInput = input as HTMLInputElement;
  textInput.addEventListener("click", () => {
    textInput.select();
    navigator.clipboard.writeText(textInput.value);
    alert("URL copied to clipboard!");
  });
});

// Drag and drop support
document.querySelectorAll(".drop-zone").forEach((dropZone) => {
  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add("highlight");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove("highlight");
    });
  });

  dropZone.addEventListener("drop", ((e: DragEvent) => {
    const dt = e.dataTransfer;
    const files = dt?.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  }) as EventListener);
});
