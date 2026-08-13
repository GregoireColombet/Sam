if (!(window as any).__contentClientInitialized) {
  (window as any).__contentClientInitialized = true;

// Elements
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanes = document.querySelectorAll(".tab-pane");

// Tab switcher
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tabId = btn.getAttribute("data-tab");
    
    tabButtons.forEach((b) => b.classList.remove("active"));
    tabPanes.forEach((p) => p.classList.remove("active"));
    
    btn.classList.add("active");
    const targetPane = document.getElementById(`tab-${tabId}`);
    if (targetPane) targetPane.classList.add("active");
  });
});

// ==========================================
// MEDIA PICKER MODAL CONTROLLER
// ==========================================
const mediaModal = document.getElementById("media-picker-modal");
const closeMediaBtn = document.getElementById("btn-close-media-modal");
const mediaSearch = document.getElementById("media-search-input") as HTMLInputElement;
const modalMediaItems = document.querySelectorAll(".modal-media-item");

let activePickerField: string | null = null;

function openMediaPicker(fieldName: string, mediaType: string = "image") {
  activePickerField = fieldName;
  
  modalMediaItems.forEach((item: any) => {
    const itemType = item.getAttribute("data-media-type") || "image";
    if (itemType === mediaType) {
      item.style.display = "";
    } else {
      item.style.display = "none";
    }
  });

  if (mediaSearch) mediaSearch.value = "";
  mediaModal?.classList.add("open");
}

function closeMediaPicker() {
  activePickerField = null;
  mediaModal?.classList.remove("open");
}

closeMediaBtn?.addEventListener("click", closeMediaPicker);

// Search filter
mediaSearch?.addEventListener("input", () => {
  const q = mediaSearch.value.toLowerCase().trim();
  modalMediaItems.forEach((item: any) => {
    const name = String(item.getAttribute("data-name")).toLowerCase();
    if (name.includes(q)) {
      item.style.display = "";
    } else {
      item.style.display = "none";
    }
  });
});

// Select Item Event
modalMediaItems.forEach((item: any) => {
  item.addEventListener("click", () => {
    if (!activePickerField) return;
    const id = item.getAttribute("data-id");
    const url = item.getAttribute("data-url");

    const pickerControl = document.querySelector(`[data-field="${activePickerField}"]`);
    if (pickerControl) {
      const input = pickerControl.querySelector("input[type='hidden']") as HTMLInputElement;
      const previewContainer = pickerControl.querySelector(".picker-preview") as HTMLElement;
      const clearBtn = pickerControl.querySelector(".btn-clear-media") as HTMLElement;

      const targetType = pickerControl.getAttribute("data-media-type") || "image";
      input.value = targetType === "video" ? url : id;

      if (targetType === "video") {
        previewContainer.innerHTML = `<span class="video-chosen" style="font-size: 0.75rem; word-break: break-all; padding: 4px; text-align: center;">${url.split("/").pop()}</span>`;
      } else {
        previewContainer.innerHTML = `<img src="${url}" alt="Selected Image" />`;
      }
      if (clearBtn) clearBtn.style.display = "";
    }

    closeMediaPicker();
  });
});

// Delegate Media Picker Triggers
document.body.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  
  // Trigger Select
  if (target.classList.contains("btn-select-media")) {
    const pickerControl = target.closest(".media-picker-control");
    const field = pickerControl?.getAttribute("data-field");
    const mediaType = pickerControl?.getAttribute("data-media-type") || "image";
    if (field) {
      openMediaPicker(field, mediaType);
    }
  }

  // Trigger Clear
  if (target.classList.contains("btn-clear-media")) {
    const pickerControl = target.closest(".media-picker-control");
    const input = pickerControl?.querySelector("input[type='hidden']") as HTMLInputElement;
    const imgContainer = pickerControl?.querySelector(".picker-preview") as HTMLElement;
    if (input && imgContainer) {
      input.value = "";
      imgContainer.innerHTML = `<span class="no-img">No Image Selected</span>`;
      target.style.display = "none";
    }
  }
});

// ==========================================
// NEWS BANNERS
// ==========================================
const newsForm = document.getElementById("news-form") as HTMLFormElement;
newsForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(newsForm);
  
  const body = {
    title_en: data.get("title_en"),
    title_zh_tw: data.get("title_zh_tw"),
    title_zh_cn: data.get("title_zh_cn"),
    body_en: data.get("body_en"),
    body_zh_tw: data.get("body_zh_tw"),
    body_zh_cn: data.get("body_zh_cn"),
    background_media_id: data.get("background_media_id") ? Number(data.get("background_media_id")) : null,
    countdown_at_utc: data.get("countdown_at_utc") ? new Date(String(data.get("countdown_at_utc"))).toISOString() : null,
    is_active: data.get("is_active") === "on"
  };

  try {
    const res = await fetch("/sam-admin/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("Failed to save news banner settings.");
    alert("News block settings updated successfully!");
  } catch (err: any) {
    alert("Error: " + err.message);
  }
});

// ==========================================
// TOUR DATE MODAL EDITOR
// ==========================================
const tourModal = document.getElementById("tour-editor-modal");
const closeTourBtn = document.getElementById("btn-close-tour-modal");
const tourForm = document.getElementById("tour-editor-form") as HTMLFormElement;
const btnAddTour = document.getElementById("btn-add-tour");

function openTourEditor(tour: any = null) {
  const titleEl = document.getElementById("tour-modal-title");
  
  if (tour) {
    if (titleEl) titleEl.textContent = "Edit Tour Date";
    (document.getElementById("tour-id") as HTMLInputElement).value = tour.id;
    (document.getElementById("tour-local-date") as HTMLInputElement).value = tour.local_date;
    (document.getElementById("tour-local-time") as HTMLInputElement).value = tour.local_time.slice(0, 5);
    (document.getElementById("tour-timezone") as HTMLInputElement).value = tour.timezone;
    (document.getElementById("tour-starts-utc") as HTMLInputElement).value = tour.starts_at_utc.slice(0, 16);
    (document.getElementById("tour-loc-en") as HTMLInputElement).value = tour.location_en;
    (document.getElementById("tour-loc-tw") as HTMLInputElement).value = tour.location_zh_tw;
    (document.getElementById("tour-loc-cn") as HTMLInputElement).value = tour.location_zh_cn;
    (document.getElementById("tour-desc-en") as HTMLTextAreaElement).value = tour.description_en;
    (document.getElementById("tour-desc-tw") as HTMLTextAreaElement).value = tour.description_zh_tw;
    (document.getElementById("tour-desc-cn") as HTMLTextAreaElement).value = tour.description_zh_cn;
    (document.getElementById("tour-active") as HTMLInputElement).checked = tour.is_active === 1;
  } else {
    if (titleEl) titleEl.textContent = "Add Tour Date";
    tourForm.reset();
    (document.getElementById("tour-id") as HTMLInputElement).value = "";
    (document.getElementById("tour-timezone") as HTMLInputElement).value = "Asia/Taipei";
    (document.getElementById("tour-active") as HTMLInputElement).checked = true;
  }

  tourModal?.classList.add("open");
}

function closeTourEditor() {
  tourModal?.classList.remove("open");
}

btnAddTour?.addEventListener("click", () => openTourEditor());
closeTourBtn?.addEventListener("click", closeTourEditor);

// Edit action trigger
document.querySelectorAll(".btn-edit-tour").forEach((btn) => {
  btn.addEventListener("click", () => {
    const data = JSON.parse(btn.getAttribute("data-tour") || "{}");
    openTourEditor(data);
  });
});

// Delete action trigger
document.querySelectorAll(".btn-delete-tour").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const id = Number(btn.getAttribute("data-id"));
    if (!confirm("Are you sure you want to delete this tour date? This will also remove any tickets links associated with it.")) return;

    try {
      const res = await fetch("/sam-admin/api/tours/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error("Delete failed.");
      alert("Tour date deleted!");
      window.location.reload();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  });
});

// Submit Tour Form
tourForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(tourForm);

  const body = {
    id: data.get("id") ? Number(data.get("id")) : null,
    local_date: data.get("local_date"),
    local_time: data.get("local_time"),
    timezone: data.get("timezone"),
    starts_at_utc: new Date(String(data.get("starts_at_utc"))).toISOString(),
    location_en: data.get("location_en"),
    location_zh_tw: data.get("location_zh_tw"),
    location_zh_cn: data.get("location_zh_cn"),
    description_en: data.get("description_en"),
    description_zh_tw: data.get("description_zh_tw"),
    description_zh_cn: data.get("description_zh_cn"),
    is_active: data.get("is_active") === "on"
  };

  try {
    const res = await fetch("/sam-admin/api/tours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("Failed to save tour date.");
    alert("Tour date saved successfully!");
    window.location.reload();
  } catch (err: any) {
    alert("Error: " + err.message);
  }
});

// ==========================================
// TICKET LINKS MANAGER MODAL
// ==========================================
const ticketModal = document.getElementById("ticket-links-modal");
const closeTicketBtn = document.getElementById("btn-close-ticket-modal");
const ticketForm = document.getElementById("ticket-links-form") as HTMLFormElement;
const ticketContainer = document.getElementById("ticket-links-container");
const btnAddTicketRow = document.getElementById("btn-add-ticket-row");

async function openTicketManager(tourDateId: number, locationName: string) {
  (document.getElementById("ticket-tour-id") as HTMLInputElement).value = String(tourDateId);
  const titleEl = document.getElementById("ticket-modal-title");
  if (titleEl) titleEl.textContent = `Ticket Links: ${locationName}`;

  if (ticketContainer) ticketContainer.innerHTML = "<div class='admin-muted'>Loading ticket platforms...</div>";

  try {
    const res = await fetch(`/sam-admin/api/tour-links?tour_date_id=${tourDateId}`);
    if (!res.ok) throw new Error("Failed to load ticketing links.");
    const links = await res.json() as any[];

    if (ticketContainer) {
      ticketContainer.innerHTML = "";
      links.forEach((link) => addTicketRow(link));
      if (links.length === 0) {
        ticketContainer.innerHTML = "<div class='empty-list-msg' id='empty-tickets-msg'>No ticket links configured. Click 'Add Platform Link'.</div>";
      }
    }

    ticketModal?.classList.add("open");
  } catch (err: any) {
    alert("Error: " + err.message);
  }
}

function closeTicketManager() {
  ticketModal?.classList.remove("open");
}

closeTicketBtn?.addEventListener("click", closeTicketManager);

document.querySelectorAll(".btn-manage-links").forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = Number(btn.getAttribute("data-id"));
    const location = String(btn.getAttribute("data-location"));
    openTicketManager(id, location);
  });
});

function addTicketRow(link: any = null) {
  const isNew = !link;
  const key = isNew ? Date.now() + Math.random().toString(36).substring(7) : link.id;
  const name = isNew ? "" : link.name;
  const url = isNew ? "" : link.url;
  const logoId = isNew ? "" : link.logo_media_id;
  const active = isNew ? true : link.is_active === 1;
  const logoKey = isNew ? "" : link.r2_key;
  
  // Remove empty warning
  const emptyMsg = document.getElementById("empty-tickets-msg");
  if (emptyMsg) emptyMsg.remove();

  const row = document.createElement("div");
  row.className = "sortable-row";
  row.innerHTML = `
    <div class="drag-handle">⋮⋮</div>
    <div class="form-group">
      <label>Platform Name</label>
      <input type="text" class="ticket-name" value="${name}" placeholder="e.g. KKTIX, tixCraft" required />
    </div>
    <div class="form-group" style="flex: 2;">
      <label>Purchase URL</label>
      <input type="url" class="ticket-url" value="${url}" placeholder="https://..." required />
    </div>
    <div class="form-group">
      <label>Platform Logo</label>
      <div class="media-picker-control" data-field="ticket_logo_${key}">
        <input type="hidden" class="ticket-logo-id" value="${logoId}" required />
        <div class="picker-preview select-sm">
          ${logoId ? `<img src="/media/${logoKey}" alt="${name}" />` : `<span class="no-img">No Logo</span>`}
        </div>
        <div class="picker-actions">
          <button type="button" class="btn-select-media btn-xs">Select</button>
        </div>
      </div>
    </div>
    <div class="form-group checkbox-cell">
      <input type="checkbox" class="ticket-active" ${active ? "checked" : ""} id="ticket-active-${key}" />
      <label for="ticket-active-${key}">Active</label>
    </div>
    <button type="button" class="btn-remove-row remove-btn">Remove</button>
  `;

  row.querySelector(".btn-remove-row")?.addEventListener("click", () => {
    row.remove();
    if (ticketContainer?.children.length === 0) {
      ticketContainer.innerHTML = "<div class='empty-list-msg' id='empty-tickets-msg'>No ticket links configured. Click 'Add Platform Link'.</div>";
    }
  });

  ticketContainer?.appendChild(row);
}

btnAddTicketRow?.addEventListener("click", () => addTicketRow());

// Save Ticket links Form
ticketForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const tourDateId = Number((document.getElementById("ticket-tour-id") as HTMLInputElement).value);
  const rows = ticketContainer?.querySelectorAll(".sortable-row");
  const links: any[] = [];

  rows?.forEach((row) => {
    const name = (row.querySelector(".ticket-name") as HTMLInputElement).value;
    const url = (row.querySelector(".ticket-url") as HTMLInputElement).value;
    const logo_media_id = Number((row.querySelector(".ticket-logo-id") as HTMLInputElement).value);
    const is_active = (row.querySelector(".ticket-active") as HTMLInputElement).checked;

    if (name && url && logo_media_id) {
      links.push({ name, url, logo_media_id, is_active });
    }
  });

  try {
    const res = await fetch("/sam-admin/api/tour-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tour_date_id: tourDateId, links })
    });

    if (!res.ok) throw new Error("Failed to save links.");
    alert("Ticket links saved successfully!");
    closeTicketManager();
    window.location.reload();
  } catch (err: any) {
    alert("Error: " + err.message);
  }
});

// ==========================================
// MODAL CONTROLLERS & DATA PARSING
// ==========================================

// Embedded data parsing
const platformsDataEl = document.getElementById("music-platforms-data");
let availablePlatforms: any[] = [];
try {
  availablePlatforms = platformsDataEl ? JSON.parse(platformsDataEl.textContent || "[]") : [];
} catch (e) {
  console.error("Failed to parse music platforms data", e);
}

const albumsDataEl = document.getElementById("albums-data");
let availableAlbums: any[] = [];
try {
  availableAlbums = albumsDataEl ? JSON.parse(albumsDataEl.textContent || "[]") : [];
} catch (e) {
  console.error("Failed to parse albums data", e);
}

const videosDataEl = document.getElementById("videos-data");
let availableVideos: any[] = [];
try {
  availableVideos = videosDataEl ? JSON.parse(videosDataEl.textContent || "[]") : [];
} catch (e) {
  console.error("Failed to parse videos data", e);
}

const socialsDataEl = document.getElementById("socials-data");
let availableSocials: any[] = [];
try {
  availableSocials = socialsDataEl ? JSON.parse(socialsDataEl.textContent || "[]") : [];
} catch (e) {
  console.error("Failed to parse socials data", e);
}

// Modal closing helper
function setupModalClose(modalId: string, closeBtnId: string, cancelBtnId: string) {
  const modal = document.getElementById(modalId);
  const closeBtn = document.getElementById(closeBtnId);
  const cancelBtn = document.getElementById(cancelBtnId);

  const closeFn = () => modal?.classList.remove("open");
  closeBtn?.addEventListener("click", closeFn);
  cancelBtn?.addEventListener("click", closeFn);
}

setupModalClose("music-editor-modal", "btn-close-music-modal", "btn-cancel-music");
setupModalClose("album-editor-modal", "btn-close-album-modal", "btn-cancel-album");
setupModalClose("video-editor-modal", "btn-close-video-modal", "btn-cancel-video");
setupModalClose("social-editor-modal", "btn-close-social-modal", "btn-cancel-social");
setupModalClose("tour-editor-modal", "btn-close-tour-modal", "btn-cancel-tour");

// Embedded platform warning modal elements
const platformWarningModal = document.getElementById("platform-warning-modal");
const closeWarningModalBtn = document.getElementById("btn-close-warning-modal");
const closeWarningModalOkBtn = document.getElementById("btn-close-warning-modal-ok");

function showPlatformWarningModal() {
  platformWarningModal?.classList.add("open");
}
function hidePlatformWarningModal() {
  platformWarningModal?.classList.remove("open");
}
closeWarningModalBtn?.addEventListener("click", hidePlatformWarningModal);
closeWarningModalOkBtn?.addEventListener("click", hidePlatformWarningModal);

function checkPlatformInUse(platformId: string | null): boolean {
  if (!platformId) return false;
  const inputs = document.querySelectorAll(`.album-platform-link-row[data-platform-id="${platformId}"] .album-platform-url`);
  for (const input of Array.from(inputs)) {
    if ((input as HTMLInputElement).value.trim() !== "") {
      return true;
    }
  }
  return false;
}

// ==========================================
// 1. MUSIC PLATFORMS CONTROLLER
// ==========================================
function openMusicEditor(music: any = null) {
  const titleEl = document.getElementById("music-modal-title");
  const form = document.getElementById("music-editor-form") as HTMLFormElement;
  if (music) {
    if (titleEl) titleEl.textContent = "Edit Music Platform";
    (document.getElementById("music-id") as HTMLInputElement).value = music.id;
    (document.getElementById("music-name") as HTMLInputElement).value = music.name;
    (document.getElementById("music-url") as HTMLInputElement).value = music.url;
    (document.getElementById("music-logo-id") as HTMLInputElement).value = music.logo_media_id || "";
    
    const preview = document.getElementById("music-logo-preview");
    if (preview) {
      if (music.logo_media_id) {
        preview.innerHTML = `<img src="/media/${music.r2_key}" alt="${music.name}" />`;
      } else {
        preview.innerHTML = `<span class="no-img">No Image</span>`;
      }
    }
    (document.getElementById("music-active") as HTMLInputElement).checked = music.is_active === 1;
  } else {
    if (titleEl) titleEl.textContent = "Add Music Platform";
    form.reset();
    (document.getElementById("music-id") as HTMLInputElement).value = "";
    (document.getElementById("music-logo-id") as HTMLInputElement).value = "";
    const preview = document.getElementById("music-logo-preview");
    if (preview) preview.innerHTML = `<span class="no-img">No Image</span>`;
    (document.getElementById("music-active") as HTMLInputElement).checked = true;
  }
  document.getElementById("music-editor-modal")?.classList.add("open");
}

document.getElementById("btn-add-music")?.addEventListener("click", () => openMusicEditor());
document.querySelectorAll(".btn-edit-music").forEach(btn => {
  btn.addEventListener("click", () => {
    const data = JSON.parse(btn.getAttribute("data-music") || "{}");
    openMusicEditor(data);
  });
});

const musicFormEl = document.getElementById("music-editor-form") as HTMLFormElement;
musicFormEl?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(musicFormEl);
  const id = data.get("id") ? Number(data.get("id")) : undefined;
  const name = String(data.get("name"));
  const url = String(data.get("url"));
  const logo_media_id = Number(data.get("logo_media_id"));
  const is_active = data.get("is_active") === "on";

  if (!logo_media_id) {
    alert("Please select a logo icon.");
    return;
  }

  const newItem = { id, name, url, logo_media_id, is_active };

  let updatedList = [...availablePlatforms];
  if (id) {
    updatedList = updatedList.map(item => item.id === id ? { ...item, ...newItem } : item);
  } else {
    updatedList.push(newItem);
  }

  try {
    const res = await fetch("/sam-admin/api/music", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ musicLinks: updatedList })
    });
    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as any;
      throw new Error(errData.error || "Failed to save music platform.");
    }
    alert("Music platform saved successfully!");
    window.location.reload();
  } catch (err: any) {
    alert("Error: " + err.message);
  }
});

document.querySelectorAll(".btn-delete-music").forEach(btn => {
  btn.addEventListener("click", async () => {
    const id = Number(btn.getAttribute("data-id"));
    if (checkPlatformInUse(String(id))) {
      showPlatformWarningModal();
      return;
    }
    if (!confirm("Are you sure you want to delete this music platform?")) return;
    const updatedList = availablePlatforms.filter(item => item.id !== id);
    try {
      const res = await fetch("/sam-admin/api/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ musicLinks: updatedList })
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as any;
        throw new Error(errData.error || "Failed to delete music platform.");
      }
      alert("Music platform deleted!");
      window.location.reload();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  });
});

// ==========================================
// 2. ALBUM COVERS CONTROLLER
// ==========================================
function openAlbumEditor(album: any = null) {
  const titleEl = document.getElementById("album-modal-title");
  const form = document.getElementById("album-editor-form") as HTMLFormElement;
  if (album) {
    if (titleEl) titleEl.textContent = "Edit Album Cover";
    (document.getElementById("album-id") as HTMLInputElement).value = album.id;
    (document.getElementById("album-title") as HTMLInputElement).value = album.title;
    (document.getElementById("album-image-id") as HTMLInputElement).value = album.image_media_id || "";
    
    const preview = document.getElementById("album-image-preview");
    if (preview) {
      if (album.image_media_id) {
        preview.innerHTML = `<img src="/media/${album.r2_key}" alt="${album.title}" />`;
      } else {
        preview.innerHTML = `<span class="no-img">No Image</span>`;
      }
    }
    (document.getElementById("album-active") as HTMLInputElement).checked = album.is_active === 1;

    // Prefill custom platform links
    const modalLinksList = document.getElementById("modal-album-links-list");
    modalLinksList?.querySelectorAll(".album-platform-link-row").forEach(row => {
      const platformId = Number(row.getAttribute("data-platform-id"));
      const input = row.querySelector(".album-platform-url") as HTMLInputElement;
      const existingLink = album.links?.find((l: any) => l.platform_id === platformId || l.platformId === platformId);
      input.value = existingLink ? existingLink.url : "";
    });
  } else {
    if (titleEl) titleEl.textContent = "Add Album Cover";
    form.reset();
    (document.getElementById("album-id") as HTMLInputElement).value = "";
    (document.getElementById("album-image-id") as HTMLInputElement).value = "";
    const preview = document.getElementById("album-image-preview");
    if (preview) preview.innerHTML = `<span class="no-img">No Image</span>`;
    (document.getElementById("album-active") as HTMLInputElement).checked = true;

    // Reset custom platform links
    const modalLinksList = document.getElementById("modal-album-links-list");
    modalLinksList?.querySelectorAll(".album-platform-url").forEach(input => {
      (input as HTMLInputElement).value = "";
    });
  }
  document.getElementById("album-editor-modal")?.classList.add("open");
}

document.getElementById("btn-add-album")?.addEventListener("click", () => openAlbumEditor());
document.querySelectorAll(".btn-edit-album").forEach(btn => {
  btn.addEventListener("click", () => {
    const data = JSON.parse(btn.getAttribute("data-album") || "{}");
    openAlbumEditor(data);
  });
});

const albumFormEl = document.getElementById("album-editor-form") as HTMLFormElement;
albumFormEl?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(albumFormEl);
  const id = data.get("id") ? Number(data.get("id")) : undefined;
  const title = String(data.get("title"));
  const image_media_id = Number(data.get("image_media_id"));
  const is_active = data.get("is_active") === "on";

  if (!image_media_id) {
    alert("Please select a cover image.");
    return;
  }

  // Grab platform links from modal-album-links-list
  const links: any[] = [];
  const modalLinksList = document.getElementById("modal-album-links-list");
  modalLinksList?.querySelectorAll(".album-platform-link-row").forEach(row => {
    const platformId = Number(row.getAttribute("data-platform-id"));
    const url = (row.querySelector(".album-platform-url") as HTMLInputElement).value.trim();
    if (url) {
      links.push({ platformId, url });
    }
  });

  const newItem = { id, title, image_media_id, is_active, links };

  let updatedList = [...availableAlbums];
  if (id) {
    updatedList = updatedList.map(item => item.id === id ? { ...item, ...newItem } : item);
  } else {
    updatedList.push(newItem);
  }

  try {
    const res = await fetch("/sam-admin/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albums: updatedList })
    });
    if (!res.ok) throw new Error("Failed to save album cover.");
    alert("Album cover saved successfully!");
    window.location.reload();
  } catch (err: any) {
    alert("Error: " + err.message);
  }
});

document.querySelectorAll(".btn-delete-album").forEach(btn => {
  btn.addEventListener("click", async () => {
    const id = Number(btn.getAttribute("data-id"));
    if (!confirm("Are you sure you want to delete this album cover?")) return;
    const updatedList = availableAlbums.filter(item => item.id !== id);
    try {
      const res = await fetch("/sam-admin/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albums: updatedList })
      });
      if (!res.ok) throw new Error("Failed to delete album cover.");
      alert("Album cover deleted!");
      window.location.reload();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  });
});

// ==========================================
// 3. VIDEO CAROUSEL (MOMENTS) CONTROLLER
// ==========================================
function openVideoEditor(video: any = null) {
  const titleEl = document.getElementById("video-modal-title");
  const form = document.getElementById("video-editor-form") as HTMLFormElement;
  if (video) {
    if (titleEl) titleEl.textContent = "Edit Moment";
    (document.getElementById("video-id") as HTMLInputElement).value = video.id;
    (document.getElementById("video-title") as HTMLInputElement).value = video.title;
    (document.getElementById("video-thumbnail-id") as HTMLInputElement).value = video.thumbnail_media_id || "";
    
    const thumbPreview = document.getElementById("video-thumbnail-preview");
    if (thumbPreview) {
      if (video.thumbnail_media_id) {
        thumbPreview.innerHTML = `<img src="/media/${video.r2_key}" alt="${video.title}" />`;
      } else {
        thumbPreview.innerHTML = `<span class="no-img">No Image</span>`;
      }
    }
    
    (document.getElementById("video-asset-url") as HTMLInputElement).value = video.url_en;
    const assetPreview = document.getElementById("video-asset-preview");
    if (assetPreview) {
      if (video.url_en) {
        assetPreview.innerHTML = `<span class="video-chosen" style="font-size: 0.75rem; word-break: break-all; padding: 4px; text-align: center;">${video.url_en.split("/").pop()}</span>`;
      } else {
        assetPreview.innerHTML = `<span class="no-img">No Video Selected</span>`;
      }
    }
    (document.getElementById("video-active") as HTMLInputElement).checked = video.is_active === 1;
  } else {
    if (titleEl) titleEl.textContent = "Add Moment";
    form.reset();
    (document.getElementById("video-id") as HTMLInputElement).value = "";
    (document.getElementById("video-thumbnail-id") as HTMLInputElement).value = "";
    const thumbPreview = document.getElementById("video-thumbnail-preview");
    if (thumbPreview) thumbPreview.innerHTML = `<span class="no-img">No Image</span>`;
    (document.getElementById("video-asset-url") as HTMLInputElement).value = "";
    const assetPreview = document.getElementById("video-asset-preview");
    if (assetPreview) assetPreview.innerHTML = `<span class="no-img">No Video Selected</span>`;
    (document.getElementById("video-active") as HTMLInputElement).checked = true;
  }
  document.getElementById("video-editor-modal")?.classList.add("open");
}

document.getElementById("btn-add-video")?.addEventListener("click", () => openVideoEditor());
document.querySelectorAll(".btn-edit-video").forEach(btn => {
  btn.addEventListener("click", () => {
    const data = JSON.parse(btn.getAttribute("data-video") || "{}");
    openVideoEditor(data);
  });
});

const videoFormEl = document.getElementById("video-editor-form") as HTMLFormElement;
videoFormEl?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(videoFormEl);
  const id = data.get("id") ? Number(data.get("id")) : undefined;
  const title = String(data.get("title"));
  const thumbnail_media_id = data.get("thumbnail_media_id") ? Number(data.get("thumbnail_media_id")) : null;
  const urlEn = String(data.get("url_en"));
  const is_active = data.get("is_active") === "on";

  if (!urlEn) {
    alert("Please select a video file.");
    return;
  }

  const newItem = {
    id,
    title,
    thumbnail_media_id,
    urlEn, urlZhTw: urlEn, urlZhCn: urlEn,
    providerEn: "cloudflare", providerZhTw: "cloudflare", providerZhCn: "cloudflare",
    is_active
  };

  let updatedList = [...availableVideos];
  if (id) {
    updatedList = updatedList.map(item => item.id === id ? { ...item, ...newItem } : item);
  } else {
    updatedList.push(newItem);
  }

  try {
    const res = await fetch("/sam-admin/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videos: updatedList })
    });
    if (!res.ok) throw new Error("Failed to save moment.");
    alert("Moment saved successfully!");
    window.location.reload();
  } catch (err: any) {
    alert("Error: " + err.message);
  }
});

document.querySelectorAll(".btn-delete-video").forEach(btn => {
  btn.addEventListener("click", async () => {
    const id = Number(btn.getAttribute("data-id"));
    if (!confirm("Are you sure you want to delete this moment?")) return;
    const updatedList = availableVideos.filter(item => item.id !== id);
    try {
      const res = await fetch("/sam-admin/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos: updatedList })
      });
      if (!res.ok) throw new Error("Failed to delete moment.");
      alert("Moment deleted!");
      window.location.reload();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  });
});

// ==========================================
// 4. SOCIAL PLATFORMS CONTROLLER
// ==========================================
function openSocialEditor(social: any = null) {
  const titleEl = document.getElementById("social-modal-title");
  const form = document.getElementById("social-editor-form") as HTMLFormElement;
  if (social) {
    if (titleEl) titleEl.textContent = "Edit Footer Social Platform";
    (document.getElementById("social-id") as HTMLInputElement).value = social.id;
    (document.getElementById("social-name") as HTMLInputElement).value = social.name;
    (document.getElementById("social-url") as HTMLInputElement).value = social.url;
    (document.getElementById("social-logo-id") as HTMLInputElement).value = social.logo_media_id || "";
    
    const preview = document.getElementById("social-logo-preview");
    if (preview) {
      if (social.logo_media_id) {
        preview.innerHTML = `<img src="/media/${social.r2_key}" alt="${social.name}" />`;
      } else {
        preview.innerHTML = `<span class="no-img">No Image</span>`;
      }
    }
    (document.getElementById("social-active") as HTMLInputElement).checked = social.is_active === 1;
  } else {
    if (titleEl) titleEl.textContent = "Add Footer Social Platform";
    form.reset();
    (document.getElementById("social-id") as HTMLInputElement).value = "";
    (document.getElementById("social-logo-id") as HTMLInputElement).value = "";
    const preview = document.getElementById("social-logo-preview");
    if (preview) preview.innerHTML = `<span class="no-img">No Image</span>`;
    (document.getElementById("social-active") as HTMLInputElement).checked = true;
  }
  document.getElementById("social-editor-modal")?.classList.add("open");
}

document.getElementById("btn-add-social")?.addEventListener("click", () => openSocialEditor());
document.querySelectorAll(".btn-edit-social").forEach(btn => {
  btn.addEventListener("click", () => {
    const data = JSON.parse(btn.getAttribute("data-social") || "{}");
    openSocialEditor(data);
  });
});

const socialFormEl = document.getElementById("social-editor-form") as HTMLFormElement;
socialFormEl?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(socialFormEl);
  const id = data.get("id") ? Number(data.get("id")) : undefined;
  const name = String(data.get("name"));
  const url = String(data.get("url"));
  const logo_media_id = Number(data.get("logo_media_id"));
  const is_active = data.get("is_active") === "on";

  if (!logo_media_id) {
    alert("Please select a logo icon.");
    return;
  }

  const newItem = { id, name, url, logo_media_id, is_active };

  let updatedList = [...availableSocials];
  if (id) {
    updatedList = updatedList.map(item => item.id === id ? { ...item, ...newItem } : item);
  } else {
    updatedList.push(newItem);
  }

  try {
    const res = await fetch("/sam-admin/api/socials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socials: updatedList })
    });
    if (!res.ok) throw new Error("Failed to save social link.");
    alert("Social link saved successfully!");
    window.location.reload();
  } catch (err: any) {
    alert("Error: " + err.message);
  }
});

document.querySelectorAll(".btn-delete-social").forEach(btn => {
  btn.addEventListener("click", async () => {
    const id = Number(btn.getAttribute("data-id"));
    if (!confirm("Are you sure you want to delete this social platform?")) return;
    const updatedList = availableSocials.filter(item => item.id !== id);
    try {
      const res = await fetch("/sam-admin/api/socials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socials: updatedList })
      });
      if (!res.ok) throw new Error("Failed to delete social link.");
      alert("Social platform deleted!");
      window.location.reload();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  });
});

// ==========================================
// MERCH SETTINGS
// ==========================================
const merchForm = document.getElementById("merch-form") as HTMLFormElement;
merchForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(merchForm);
  try {
    const resGet = await fetch("/sam-admin/api/settings");
    const existing = resGet.ok ? await resGet.json() as any : {};
    const body = {
      ...existing,
      merch_url_en: formData.get("merch_url_en"),
      merch_url_zh_tw: formData.get("merch_url_zh_tw"),
      merch_url_zh_cn: formData.get("merch_url_zh_cn"),
      merch_is_active: formData.get("merch_is_active") === "on"
    };

    const res = await fetch("/sam-admin/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("Failed to save settings.");
    alert("Shop settings saved successfully!");
  } catch (err: any) {
    alert("Error: " + err.message);
  }
});

// ==========================================
// BONUS SETTINGS
// ==========================================
const bonusForm = document.getElementById("bonus-form") as HTMLFormElement;
bonusForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(bonusForm);
  try {
    const resGet = await fetch("/sam-admin/api/settings");
    const existing = resGet.ok ? await resGet.json() as any : {};
    const body = {
      ...existing,
      bonus_title_en: formData.get("bonus_title_en"),
      bonus_title_zh_tw: formData.get("bonus_title_zh_tw"),
      bonus_title_zh_cn: formData.get("bonus_title_zh_cn"),
      bonus_text_en: formData.get("bonus_text_en"),
      bonus_text_zh_tw: formData.get("bonus_text_zh_tw"),
      bonus_text_zh_cn: formData.get("bonus_text_zh_cn"),
      bonus_media_id: formData.get("bonus_media_id") ? Number(formData.get("bonus_media_id")) : null,
      bonus_is_active: formData.get("bonus_is_active") === "on"
    };

    const res = await fetch("/sam-admin/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("Failed to save settings.");
    alert("Bonus page settings saved successfully!");
  } catch (err: any) {
    alert("Error: " + err.message);
  }
});
}
