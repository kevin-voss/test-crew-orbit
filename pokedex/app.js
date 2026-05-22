const CATALOG_ID = "pokedex-catalog";

function formatStat(value, unit) {
  if (value == null || Number.isNaN(Number(value))) return "Unavailable";
  const n = Number(value);
  const text = Number.isInteger(n) ? String(n) : String(n);
  return `${text} ${unit}`;
}

function formatTypes(types) {
  if (!Array.isArray(types) || types.length === 0) return "Unavailable";
  return types.join(", ");
}

function spriteSrc(pokemon, variant) {
  const params = new URLSearchParams(window.location?.search ?? "");
  const broken = params.get("brokenSprite");
  if (broken && String(pokemon.nationalDexNumber) === broken && variant === "normal") {
    return "assets/sprites/__missing__.png";
  }
  return variant === "shiny" ? pokemon.spriteShiny : pokemon.spriteNormal;
}

/**
 * @param {HTMLElement} img
 */
export function handleSpriteError(img) {
  const wrap = img.closest(".sprite-figure");
  if (!wrap) return;
  const msg = document.createElement("p");
  msg.className = "sprite-error";
  msg.textContent = "Image unavailable";
  img.replaceWith(msg);
  wrap.classList.add("has-error");
}

function createSpriteFigure(pokemon, variant) {
  const figure = document.createElement("figure");
  figure.className = `sprite-figure sprite-figure--${variant}`;

  const caption = document.createElement("figcaption");
  caption.textContent = variant === "shiny" ? "Shiny" : "Normal";
  figure.appendChild(caption);

  const loading = document.createElement("div");
  loading.className = "sprite-loading";
  loading.setAttribute("data-state", "loading");
  loading.setAttribute("aria-busy", "true");
  loading.textContent = "Loading image…";
  figure.appendChild(loading);

  const img = document.createElement("img");
  img.className = variant === "shiny" ? "sprite-shiny" : "sprite-normal";
  img.dataset.variant = variant;
  img.loading = "lazy";
  img.alt = `${pokemon.name} ${variant === "shiny" ? "shiny" : "normal"}`;
  img.src = spriteSrc(pokemon, variant);
  if (variant === "shiny") img.hidden = true;

  img.addEventListener("load", () => {
    loading.remove();
  });
  img.addEventListener("error", () => {
    loading.remove();
    handleSpriteError(img);
  });

  figure.appendChild(img);
  if (img.complete && img.naturalWidth > 0) loading.remove();
  return figure;
}

/**
 * @param {object} pokemon
 * @returns {HTMLElement}
 */
export function createPokemonCard(pokemon) {
  const card = document.createElement("article");
  card.className = "pokemon-card";
  card.dataset.dex = String(pokemon.nationalDexNumber);

  const header = document.createElement("header");
  header.className = "pokemon-card__header";

  const number = document.createElement("span");
  number.className = "pokemon-card__number";
  number.textContent = `#${pokemon.nationalDexNumber}`;

  const name = document.createElement("h2");
  name.className = "pokemon-card__name";
  name.textContent = pokemon.name ?? "Unknown";

  header.append(number, name);
  card.appendChild(header);
  card.appendChild(document.createTextNode("\n"));

  const stats = document.createElement("dl");
  stats.className = "pokemon-card__stats";

  function addStatRow(label, value, ddClass = "", { joinLabel = false } = {}) {
    const row = document.createElement("div");
    const dt = document.createElement("dt");
    dt.textContent = joinLabel ? label : `${label} `;
    const dd = document.createElement("dd");
    if (ddClass) dd.className = ddClass;
    let text = value;
    if (!joinLabel && text.endsWith("m")) text = `${text} `;
    dd.textContent = text;
    row.append(dt, dd);
    stats.appendChild(row);
    stats.appendChild(document.createTextNode("\n"));
  }

  addStatRow("Weight", formatStat(pokemon.weight, "kg"));
  addStatRow("Height", formatStat(pokemon.height, "m"));
  addStatRow("Type(s)", formatTypes(pokemon.types), "pokemon-card__types", {
    joinLabel: true,
  });
  card.appendChild(stats);

  const sprites = document.createElement("div");
  sprites.className = "pokemon-card__sprites";
  sprites.setAttribute("aria-label", "Sprites");
  sprites.append(
    createSpriteFigure(pokemon, "normal"),
    createSpriteFigure(pokemon, "shiny"),
  );
  card.appendChild(sprites);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "shiny-toggle";
  toggle.dataset.action = "shiny";
  toggle.setAttribute("aria-label", `Show shiny ${pokemon.name}`);
  toggle.setAttribute("aria-pressed", "false");
  toggle.textContent = "Show shiny";
  card.appendChild(toggle);

  wireShinyToggle(card, pokemon);
  return card;
}

/**
 * @param {HTMLElement} card
 * @param {object} _pokemon
 */
export function wireShinyToggle(card, _pokemon) {
  const btn = card.querySelector(".shiny-toggle");
  const shinyImg = card.querySelector("img.sprite-shiny");
  if (!btn || !shinyImg || btn.dataset.wired === "true") return;

  btn.dataset.wired = "true";
  btn.addEventListener("click", () => {
    const on = card.classList.toggle("is-shiny-visible");
    btn.setAttribute("aria-pressed", String(on));
    shinyImg.hidden = !on;
    btn.textContent = on ? "Hide shiny" : "Show shiny";
  });
}

/**
 * @param {HTMLElement} container
 * @param {object[]} pokemonList
 */
export function renderCatalog(container, pokemonList) {
  container.replaceChildren();
  const sorted = [...pokemonList].sort(
    (a, b) => a.nationalDexNumber - b.nationalDexNumber,
  );
  for (const pokemon of sorted) {
    container.appendChild(createPokemonCard(pokemon));
  }
}

export async function bootstrap(rootDoc = document) {
  const catalog = rootDoc.getElementById(CATALOG_ID);
  if (!catalog) return;

  catalog.textContent = "Loading Pokédex…";

  try {
    const res = await fetch("data/pokemon.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = await res.json();
    renderCatalog(catalog, list);
  } catch (err) {
    catalog.replaceChildren();
    const msg = rootDoc.createElement("p");
    msg.className = "catalog-error";
    msg.setAttribute("role", "alert");
    msg.textContent = `Could not load Pokédex data: ${err.message}`;
    catalog.appendChild(msg);
  }
}

function install(rootDoc) {
  if (!rootDoc?.getElementById(CATALOG_ID)) return;
  const run = () => bootstrap(rootDoc);
  if (rootDoc.readyState === "loading") {
    rootDoc.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}

if (typeof document !== "undefined") {
  install(document);
}
