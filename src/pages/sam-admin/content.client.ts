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

function openMediaPicker(fieldName: string) {
  activePickerField = fieldName;
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
      const imgContainer = pickerControl.querySelector(".picker-preview") as HTMLElement;
      const clearBtn = pickerControl.querySelector(".btn-clear-media") as HTMLElement;

      input.value = id;
      imgContainer.innerHTML = `<img src="${url}" alt="Selected Image" />`;
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
    if (field) {
      openMediaPicker(field);
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
// ALBUM COVERS LIST
// ==========================================
const albumsForm = document.getElementById("albums-form") as HTMLFormElement;
const albumsContainer = document.getElementById("albums-container");
const btnAddAlbumRow = document.getElementById("btn-add-album-row");

function addAlbumRow() {
  const key = Date.now() + Math.random().toString(36).substring(7);
  const row = document.createElement("div");
  row.className = "sortable-row";
  row.innerHTML = `
    <div class="drag-handle">⋮⋮</div>
    <div class="form-group">
      <label>Album Title</label>
      <input type="text" class="album-title" required />
    </div>
    <div class="form-group">
      <label>Cover Image</label>
      <div class="media-picker-control" data-field="album_img_${key}">
        <input type="hidden" class="album-media-id" required />
        <div class="picker-preview select-sm">
          <span class="no-img">No Image</span>
        </div>
        <div class="picker-actions">
          <button type="button" class="btn-select-media btn-xs">Select</button>
        </div>
      </div>
    </div>
    <div class="form-group checkbox-cell">
      <input type="checkbox" class="album-active" checked id="album-active-${key}" />
      <label for="album-active-${key}">Active</label>
    </div>
    <button type="button" class="btn-remove-row remove-btn">Remove</button>
  `;

  row.querySelector(".btn-remove-row")?.addEventListener("click", () => {
    row.remove();
  });

  albumsContainer?.appendChild(row);
}

btnAddAlbumRow?.addEventListener("click", addAlbumRow);
document.querySelectorAll("#albums-container .btn-remove-row").forEach((btn: any) => {
  btn.addEventListener("click", () => btn.closest(".sortable-row").remove());
});

albumsForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rows = albumsContainer?.querySelectorAll(".sortable-row");
  const albumsList: any[] = [];

  rows?.forEach((row) => {
    const title = (row.querySelector(".album-title") as HTMLInputElement).value;
    const image_media_id = Number((row.querySelector(".album-media-id") as HTMLInputElement).value);
    const is_active = (row.querySelector(".album-active") as HTMLInputElement).checked;

    if (title && image_media_id) {
      albumsList.push({ title, image_media_id, is_active });
    }
  });

  try {
    const res = await fetch("/sam-admin/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albums: albumsList })
    });
    if (!res.ok) throw new Error("Failed to save albums.");
    alert("Album cover list saved successfully!");
    window.location.reload();
  } catch (err: any) {
    alert("Error: " + err.message);
  }
});

// ==========================================
// VIDEO PLAYLIST
// ==========================================
const videosForm = document.getElementById("videos-form") as HTMLFormElement;
const videosContainer = document.getElementById("videos-container");
const btnAddVideoRow = document.getElementById("btn-add-video-row");

function addVideoRow() {
  const key = Date.now() + Math.random().toString(36).substring(7);
  const row = document.createElement("div");
  row.className = "sortable-row video-row";
  row.innerHTML = `
    <div class="drag-handle">⋮⋮</div>
    <div class="video-grid-inputs">
      <div class="form-grid">
        <div class="form-group">
          <label>Video Title</label>
          <input type="text" class="video-title" required />
        </div>
        <div class="form-group">
          <label>Thumbnail Cover</label>
          <div class="media-picker-control" data-field="video_thumb_${key}">
            <input type="hidden" class="video-thumbnail-id" />
            <div class="picker-preview select-sm">
              <span class="no-img">No Image</span>
            </div>
            <div class="picker-actions">
              <button type="button" class="btn-select-media btn-xs">Select</button>
            </div>
          </div>
        </div>
        <div class="form-group checkbox-cell">
          <input type="checkbox" class="video-active" checked id="video-active-${key}" />
          <label for="video-active-${key}">Active</label>
        </div>
      </div>

      <div class="form-grid pt-2">
        <div class="form-group">
          <label>URL (English)</label>
          <input type="url" class="video-url-en" required placeholder="https://youtube.com/watch?v=..." />
        </div>
        <div class="form-group">
          <label>URL (Traditional Chinese)</label>
          <input type="url" class="video-url-zh-tw" required placeholder="https://youtube.com/watch?v=..." />
        </div>
        <div class="form-group">
          <label>URL (Simplified Chinese)</label>
          <input type="url" class="video-url-zh-cn" required placeholder="e.g. Bilibili link for CN region" />
        </div>
      </div>
    </div>
    <button type="button" class="btn-remove-row remove-btn">Remove</button>
  `;

  row.querySelector(".btn-remove-row")?.addEventListener("click", () => {
    row.remove();
  });

  videosContainer?.appendChild(row);
}

btnAddVideoRow?.addEventListener("click", addVideoRow);
document.querySelectorAll("#videos-container .btn-remove-row").forEach((btn: any) => {
  btn.addEventListener("click", () => btn.closest(".sortable-row").remove());
});

videosForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rows = videosContainer?.querySelectorAll(".video-row");
  const videosList: any[] = [];

  rows?.forEach((row) => {
    const title = (row.querySelector(".video-title") as HTMLInputElement).value;
    const thumbnail_media_id = row.querySelector(".video-thumbnail-id")?.getAttribute("value") 
      ? Number((row.querySelector(".video-thumbnail-id") as HTMLInputElement).value) 
      : null;
    const is_active = (row.querySelector(".video-active") as HTMLInputElement).checked;
    const urlEn = (row.querySelector(".video-url-en") as HTMLInputElement).value;
    const urlZhTw = (row.querySelector(".video-url-zh-tw") as HTMLInputElement).value;
    const urlZhCn = (row.querySelector(".video-url-zh-cn") as HTMLInputElement).value;

    const providerEn = urlEn.includes("vimeo") ? "vimeo" : "youtube";
    const providerZhTw = urlZhTw.includes("vimeo") ? "vimeo" : "youtube";
    const providerZhCn = urlZhCn.includes("bilibili") ? "bilibili" : urlZhCn.includes("vimeo") ? "vimeo" : "youtube";

    if (title && urlEn && urlZhTw && urlZhCn) {
      videosList.push({
        title,
        thumbnail_media_id,
        is_active,
        urlEn, urlZhTw, urlZhCn,
        providerEn, providerZhTw, providerZhCn
      });
    }
  });

  try {
    const res = await fetch("/sam-admin/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videos: videosList })
    });
    if (!res.ok) throw new Error("Failed to save video list.");
    alert("Video carousel saved successfully!");
    window.location.reload();
  } catch (err: any) {
    alert("Error: " + err.message);
  }
});

// ==========================================
// MERCH SETTINGS
// ==========================================
const merchForm = document.getElementById("merch-form") as HTMLFormElement;
merchForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(merchForm);
  const body = {
    merch_url_en: formData.get("merch_url_en"),
    merch_url_zh_tw: formData.get("merch_url_zh_tw"),
    merch_url_zh_cn: formData.get("merch_url_zh_cn"),
    merch_is_active: formData.get("merch_is_active") === "on"
  };

  try {
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
// SOCIAL PLATFORMS LIST
// ==========================================
const socialsForm = document.getElementById("socials-form") as HTMLFormElement;
const socialsContainer = document.getElementById("socials-container");
const btnAddSocialRow = document.getElementById("btn-add-social-row");

function addSocialRow() {
  const key = Date.now() + Math.random().toString(36).substring(7);
  const row = document.createElement("div");
  row.className = "sortable-row";
  row.innerHTML = `
    <div class="drag-handle">⋮⋮</div>
    <div class="form-group">
      <label>Platform Name</label>
      <input type="text" class="social-name" required placeholder="e.g. Instagram" />
    </div>
    <div class="form-group" style="flex: 2;">
      <label>Target URL</label>
      <input type="url" class="social-url" required placeholder="https://..." />
    </div>
    <div class="form-group">
      <label>Logo Icon</label>
      <div class="media-picker-control" data-field="social_logo_${key}">
        <input type="hidden" class="social-media-id" required />
        <div class="picker-preview select-sm">
          <span class="no-img">No Image</span>
        </div>
        <div class="picker-actions">
          <button type="button" class="btn-select-media btn-xs">Select</button>
        </div>
      </div>
    </div>
    <div class="form-group checkbox-cell">
      <input type="checkbox" class="social-active" checked id="social-active-${key}" />
      <label for="social-active-${key}">Active</label>
    </div>
    <button type="button" class="btn-remove-row remove-btn">Remove</button>
  `;

  row.querySelector(".btn-remove-row")?.addEventListener("click", () => {
    row.remove();
  });

  socialsContainer?.appendChild(row);
}

btnAddSocialRow?.addEventListener("click", addSocialRow);
document.querySelectorAll("#socials-container .btn-remove-row").forEach((btn: any) => {
  btn.addEventListener("click", () => btn.closest(".sortable-row").remove());
});

socialsForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rows = socialsContainer?.querySelectorAll(".sortable-row");
  const socialsList: any[] = [];

  rows?.forEach((row) => {
    const name = (row.querySelector(".social-name") as HTMLInputElement).value;
    const url = (row.querySelector(".social-url") as HTMLInputElement).value;
    const logo_media_id = Number((row.querySelector(".social-media-id") as HTMLInputElement).value);
    const is_active = (row.querySelector(".social-active") as HTMLInputElement).checked;

    if (name && url && logo_media_id) {
      socialsList.push({ name, url, logo_media_id, is_active });
    }
  });

  try {
    const res = await fetch("/sam-admin/api/socials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socials: socialsList })
    });
    if (!res.ok) throw new Error("Failed to save socials.");
    alert("Social links updated successfully!");
    window.location.reload();
  } catch (err: any) {
    alert("Error: " + err.message);
  }
});

// ==========================================
// MUSIC PLATFORMS LIST
// ==========================================
const musicForm = document.getElementById("music-links-form") as HTMLFormElement;
const musicContainer = document.getElementById("music-links-container");
const btnAddMusicRow = document.getElementById("btn-add-music-row");

function addMusicRow() {
  const key = Date.now() + Math.random().toString(36).substring(7);
  const row = document.createElement("div");
  row.className = "sortable-row";
  row.innerHTML = `
    <div class="drag-handle">⋮⋮</div>
    <div class="form-group">
      <label>Platform Name</label>
      <input type="text" class="music-name" required placeholder="e.g. Spotify" />
    </div>
    <div class="form-group" style="flex: 2;">
      <label>Target URL</label>
      <input type="url" class="music-url" required placeholder="https://..." />
    </div>
    <div class="form-group">
      <label>Logo Icon</label>
      <div class="media-picker-control" data-field="music_logo_${key}">
        <input type="hidden" class="music-media-id" required />
        <div class="picker-preview select-sm">
          <span class="no-img">No Image</span>
        </div>
        <div class="picker-actions">
          <button type="button" class="btn-select-media btn-xs">Select</button>
        </div>
      </div>
    </div>
    <div class="form-group checkbox-cell">
      <input type="checkbox" class="music-active" checked id="music-active-${key}" />
      <label for="music-active-${key}">Active</label>
    </div>
    <button type="button" class="btn-remove-row remove-btn">Remove</button>
  `;

  row.querySelector(".btn-remove-row")?.addEventListener("click", () => {
    row.remove();
  });

  musicContainer?.appendChild(row);
}

btnAddMusicRow?.addEventListener("click", addMusicRow);
document.querySelectorAll("#music-links-container .btn-remove-row").forEach((btn: any) => {
  btn.addEventListener("click", () => btn.closest(".sortable-row").remove());
});

musicForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rows = musicContainer?.querySelectorAll(".sortable-row");
  const musicList: any[] = [];

  rows?.forEach((row) => {
    const name = (row.querySelector(".music-name") as HTMLInputElement).value;
    const url = (row.querySelector(".music-url") as HTMLInputElement).value;
    const logo_media_id = Number((row.querySelector(".music-media-id") as HTMLInputElement).value);
    const is_active = (row.querySelector(".music-active") as HTMLInputElement).checked;

    if (name && url && logo_media_id) {
      musicList.push({ name, url, logo_media_id, is_active });
    }
  });

  try {
    const res = await fetch("/sam-admin/api/music", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ musicLinks: musicList })
    });
    if (!res.ok) throw new Error("Failed to save music platform links.");
    alert("Music platform links updated successfully!");
    window.location.reload();
  } catch (err: any) {
    alert("Error: " + err.message);
  }
});
