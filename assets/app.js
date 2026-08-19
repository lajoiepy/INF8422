/* Site public INF8422 — rend la liste des sujets à partir de site.yaml.
 * Le contenu s'édite dans site.yaml (côté INF8422_internal), jamais ici.
 * Les libellés d'interface (en-têtes, boutons, badges, pied de page) vivent
 * dans UI ci-dessous : toute chaîne visible doit y être dans les deux langues,
 * sinon le bouton FR/EN laissera un morceau de page dans l'autre langue. */

const UI = {
  fr: {
    topicsHeading: "Sujets du cours",
    topicsNote: "Les diapositives sont publiées au fur et à mesure de la session.",
    empty: "Aucun sujet publié pour l'instant.",
    slides: "Diapositives",
    pdf: "PDF",
    comingSoon: "À venir",
    frenchOnly: "Version française seulement",
    footer: "Diapositives générées avec Slidev · Site hébergé sur GitHub Pages",
    toggleLabel: "English",
    htmlLang: "fr",
    loadError: "Erreur de chargement de site.yaml",
  },
  en: {
    topicsHeading: "Course topics",
    topicsNote: "Slides are published as the term goes on.",
    empty: "No topic published yet.",
    slides: "Slides",
    pdf: "PDF",
    comingSoon: "Coming soon",
    frenchOnly: "French version only",
    footer: "Slides built with Slidev · Site hosted on GitHub Pages",
    toggleLabel: "Français",
    htmlLang: "en",
    loadError: "Failed to load site.yaml",
  },
};

const LANG_KEY = "inf8422-lang";

function currentLang() {
  const fromQuery = new URLSearchParams(location.search).get("lang");
  if (fromQuery === "fr" || fromQuery === "en") return fromQuery;
  const stored = localStorage.getItem(LANG_KEY);
  return stored === "en" ? "en" : "fr";
}

/* Champ bilingue : soit une chaîne simple, soit { fr, en }.
 * Le français est la langue par défaut et sert de repli quand l'anglais
 * manque — c'est le cas des cours dont seule la version française existe. */
function pick(field, lang) {
  if (field == null) return { value: "", fallback: false };
  if (typeof field === "string") return { value: field, fallback: false };
  const wanted = field[lang];
  if (wanted) return { value: wanted, fallback: false };
  return { value: field.fr ?? "", fallback: lang !== "fr" };
}

function tr(field, lang) {
  return pick(field, lang).value;
}

function setText(id, value) {
  document.getElementById(id).textContent = value ?? "";
}

function escapeAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* `deck` et `pdf` sont bilingues comme le reste : "1" pointe le même deck dans
 * les deux langues, { fr: "1", en: "1_en" } sert la version anglaise quand elle
 * existe. Sans version anglaise, le lien retombe sur le français et porte une
 * étiquette « fr » pour que le lecteur anglophone sache à quoi s'attendre. */
function link(field, lang, ui, spec) {
  const { value, fallback } = pick(field, lang);
  if (!value) return "";
  const tag = fallback ? `<span class="lang-tag" title="${ui.frenchOnly}">fr</span>` : "";
  return `<a class="slide-link ${spec.cls}" href="${spec.href(escapeAttr(value))}">${spec.label}${tag}</a>`;
}

function topicLinks(topic, lang, ui) {
  const links = [
    link(topic.deck, lang, ui, { href: (v) => `slides/${v}/`, label: ui.slides, cls: "slide-link-html" }),
    link(topic.pdf, lang, ui, { href: (v) => `pdf/${v}`, label: ui.pdf, cls: "slide-link-pdf" }),
  ].filter(Boolean);

  if (links.length === 0) {
    return `<span class="badge badge-soon">${ui.comingSoon}</span>`;
  }
  return links.join(" ");
}

function render(config, lang) {
  const ui = UI[lang];
  document.documentElement.lang = ui.htmlLang;

  const site = config.site ?? {};
  document.title = `${site.code ?? "INF8422"} — ${tr(site.title, lang)}`;
  setText("site-code", site.code);
  setText("site-title", tr(site.title, lang));
  setText("site-instructor", site.instructor);
  setText("site-institution", tr(site.institution, lang));
  setText("site-term", tr(site.term, lang));

  setText("topics-heading", ui.topicsHeading);
  setText("topics-note", ui.topicsNote);
  setText("footer-text", ui.footer);
  document.getElementById("lang-toggle").textContent = ui.toggleLabel;

  const list = document.getElementById("topics-list");
  const topics = config.topics ?? [];
  if (topics.length === 0) {
    list.innerHTML = `<li class="topic topic-empty">${ui.empty}</li>`;
    return;
  }
  list.innerHTML = topics
    .map(
      (topic, i) =>
        `<li class="topic">` +
        `<span class="topic-num">${i + 1}</span>` +
        `<span class="topic-title">${escapeHtml(tr(topic.title, lang))}</span>` +
        `<span class="topic-links">${topicLinks(topic, lang, ui)}</span>` +
        `</li>`,
    )
    .join("");
}

async function main() {
  const response = await fetch("site.yaml", { cache: "no-cache" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const config = jsyaml.load(await response.text()) ?? {};

  let lang = currentLang();
  render(config, lang);

  document.getElementById("lang-toggle").addEventListener("click", () => {
    lang = lang === "fr" ? "en" : "fr";
    localStorage.setItem(LANG_KEY, lang);
    render(config, lang);
  });
}

main().catch((err) => {
  const lang = currentLang();
  document.getElementById("topics-note").textContent = `${UI[lang].loadError} : ${err}`;
});
