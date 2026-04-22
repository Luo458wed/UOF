function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(dateString) {
  return dateString;
}

function noteHref(note) {
  return `note.html?slug=${encodeURIComponent(note.slug)}`;
}

function renderCount(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = String(value);
}

function renderCollection(list, rootId, type) {
  const root = document.getElementById(rootId);
  if (!root) return;

  root.innerHTML = list.map((item) => {
    const meta = type === "notes"
      ? [item.course, item.category, formatDate(item.updated)]
      : [item.source, item.category, formatDate(item.updated)];
    const actionText = type === "notes" ? "阅读笔记" : "打开资料";
    const href = type === "notes" ? noteHref(item) : item.link;
    const target = type === "notes" ? "_self" : "_blank";

    return `
      <article class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">${escapeHtml(item.title)}</h2>
            <div class="meta-row">
              ${meta.map((entry) => `<span class="meta-chip">${escapeHtml(entry)}</span>`).join("")}
            </div>
          </div>
        </div>
        <p>${escapeHtml(item.summary)}</p>
        <div class="tag-row">
          ${item.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <a class="card-link" href="${escapeHtml(href)}" target="${target}" rel="noreferrer">${actionText}</a>
      </article>
    `;
  }).join("");
}

function setupFilterButtons(items, filterRootId, activeCategory, onChange) {
  const root = document.getElementById(filterRootId);
  if (!root) return;

  const allLabel = "全部";
  const categories = [allLabel, ...new Set(items.map((item) => item.category))];
  root.innerHTML = categories.map((category) => `
    <button class="filter-chip ${category === activeCategory ? "active" : ""}" type="button" data-category="${escapeHtml(category)}">
      ${escapeHtml(category)}
    </button>
  `).join("");

  root.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      onChange(button.dataset.category || allLabel);
    });
  });
}

function setupSearchableCollection(config) {
  const { items, searchId, filterRootId, listId, emptyId, type } = config;
  const search = document.getElementById(searchId);
  if (!search) return;

  const allLabel = "全部";
  let activeCategory = allLabel;

  function renderFilters() {
    setupFilterButtons(items, filterRootId, activeCategory, (category) => {
      activeCategory = category;
      renderFilters();
      updateView();
    });
  }

  function updateView() {
    const keyword = search.value.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const matchesCategory = activeCategory === allLabel || item.category === activeCategory;
      const haystack = [
        item.title,
        item.summary,
        item.category,
        item.course || "",
        item.source || "",
        ...item.tags
      ].join(" ").toLowerCase();

      return matchesCategory && (!keyword || haystack.includes(keyword));
    });

    renderCollection(filtered, listId, type);

    const empty = document.getElementById(emptyId);
    if (empty) {
      empty.classList.toggle("hidden", filtered.length > 0);
    }
  }

  renderFilters();
  search.addEventListener("input", updateView);
  updateView();
}

function renderHomePage() {
  if (!document.getElementById("latest-notes")) return;
  renderCount("note-count", notes.length);
  renderCount("resource-count", resources.length);
  renderCollection(notes.slice(0, 3), "latest-notes", "notes");
  renderCollection(resources.slice(0, 3), "featured-resources", "resources");
}

function renderNotesPage() {
  setupSearchableCollection({
    items: notes,
    searchId: "notes-search",
    filterRootId: "notes-filters",
    listId: "notes-list",
    emptyId: "notes-empty",
    type: "notes"
  });
}

function renderResourcesPage() {
  setupSearchableCollection({
    items: resources,
    searchId: "resources-search",
    filterRootId: "resources-filters",
    listId: "resources-list",
    emptyId: "resources-empty",
    type: "resources"
  });
}

function parseInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let inList = false;
  let inCode = false;
  let paragraph = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${parseInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function closeList() {
    if (!inList) return;
    html.push("</ul>");
    inList = false;
  }

  for (const line of lines) {
    const trimmed = line.trimEnd();

    if (trimmed.startsWith("```")) {
      flushParagraph();
      closeList();
      if (inCode) {
        html.push("</code></pre>");
        inCode = false;
      } else {
        html.push("<pre><code>");
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      html.push(`${escapeHtml(trimmed)}\n`);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      html.push(`<h${level + 1}>${parseInlineMarkdown(heading[2])}</h${level + 1}>`);
      continue;
    }

    const listItem = trimmed.match(/^- (.+)$/);
    if (listItem) {
      flushParagraph();
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${parseInlineMarkdown(listItem[1])}</li>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();
  if (inCode) {
    html.push("</code></pre>");
  }

  return html.join("");
}

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

async function renderNotePage() {
  const article = document.getElementById("note-article");
  if (!article) return;

  const slug = getQueryParam("slug");
  const note = notes.find((entry) => entry.slug === slug);
  const titleNode = document.getElementById("note-title");
  const metaNode = document.getElementById("note-meta");
  const tagsNode = document.getElementById("note-tags");
  const stateNode = document.getElementById("note-state");

  if (!note) {
    if (titleNode) titleNode.textContent = "未找到这篇笔记";
    if (stateNode) stateNode.textContent = "请返回课程笔记页，确认链接是否正确。";
    return;
  }

  document.title = `${note.title} - Study Archive`;
  if (titleNode) titleNode.textContent = note.title;
  if (metaNode) {
    metaNode.innerHTML = [
      note.course,
      note.category,
      formatDate(note.updated)
    ].map((entry) => `<span class="meta-chip">${escapeHtml(entry)}</span>`).join("");
  }
  if (tagsNode) {
    tagsNode.innerHTML = note.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  }
  if (stateNode) stateNode.textContent = "正在加载 Markdown 内容...";

  try {
    const response = await fetch(note.markdown);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const markdown = await response.text();
    article.innerHTML = markdownToHtml(markdown);
    if (stateNode) stateNode.textContent = "";
  } catch (error) {
    article.innerHTML = "";
    if (stateNode) {
      stateNode.textContent = "Markdown 加载失败，请稍后再试。";
    }
  }
}

renderHomePage();
renderNotesPage();
renderResourcesPage();
renderNotePage();
