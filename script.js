import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ====== CONFIGURAÇÃO DO SUPABASE ======
// Project Settings > API: copie a "Project URL" e a chave "anon public".
// A chave anon foi feita para uso no frontend (a segurança vem das políticas RLS).
const SUPABASE_URL = "https://nnkvqjyedlfzgywahgfy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_qllgonLnIH3baioY-S_BVQ_vQjh8UfA";
// =======================================

const MAX_TIME = 6;
const configurado =
  SUPABASE_URL.startsWith("https://") && !SUPABASE_ANON_KEY.startsWith("COLE_");
const supabase = configurado ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const areaResultado = document.getElementById("resultado");
const listaTime = document.getElementById("lista-time");
const contador = document.getElementById("contador-time");
const campoBusca = document.getElementById("campo-busca");
const botaoBuscar = document.getElementById("botao-buscar");

let pokemonAtual = null;
let time = [];

if (!configurado) document.getElementById("aviso-config").hidden = false;

/* ---------- Utilidades de DOM ---------- */
function el(tag, opcoes = {}, filhos = []) {
  const e = document.createElement(tag);
  if (opcoes.texto) e.textContent = opcoes.texto;
  if (opcoes.classe) e.className = opcoes.classe;
  if (opcoes.attrs) for (const [k, v] of Object.entries(opcoes.attrs)) e.setAttribute(k, v);
  filhos.forEach((f) => e.appendChild(f));
  return e;
}

function mostrarMensagem(texto, erro = false) {
  areaResultado.replaceChildren(
    el("p", { texto, classe: "mensagem" + (erro ? " erro" : "") })
  );
}

/* ---------- Etapa 01: consumo da PokeAPI ---------- */
async function buscarPokemon(termo) {
  mostrarMensagem("Carregando...");
  try {
    const resposta = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(termo)}`);
    if (!resposta.ok) throw new Error("Não encontrado");
    const d = await resposta.json();

    pokemonAtual = {
      id: d.id,
      nome: d.name,
      sprite: d.sprites.front_default,
      altura: d.height / 10,   // decímetros -> metros
      peso: d.weight / 10,     // hectogramas -> kg
      tipos: d.types.map((t) => t.type.name),
      habilidades: d.abilities.map((a) => a.ability.name),
    };
    renderizarCartao(pokemonAtual);
  } catch (erro) {
    pokemonAtual = null;
    mostrarMensagem("Ops! Nenhum Pokémon encontrado. Tente outro nome ou número.", true);
  }
}

function renderizarCartao(p) {
  const tipos = el("p", {}, p.tipos.map((t) => el("span", { texto: t, classe: "tipo" })));
  const detalhes = el("ul", {}, [
    el("li", { texto: `Nº ${p.id}` }),
    el("li", { texto: `Altura: ${p.altura} m  ·  Peso: ${p.peso} kg` }),
    el("li", { texto: `Habilidades: ${p.habilidades.join(", ")}` }),
  ]);
  const botao = el("button", { texto: "Adicionar ao time", attrs: { id: "botao-favoritar" } });
  const jaNoTime = time.some((i) => i.nome_item === p.nome);
  if (jaNoTime) { botao.disabled = true; botao.textContent = "Já está no time"; }
  else if (time.length >= MAX_TIME) { botao.disabled = true; botao.textContent = "Time cheio (6/6)"; }
  botao.addEventListener("click", () => adicionarAoTime(p));

  areaResultado.replaceChildren(
    el("article", { classe: "cartao" }, [
      el("img", { attrs: { src: p.sprite || "", alt: p.nome } }),
      el("h2", { texto: p.nome }),
      tipos,
      detalhes,
      botao,
    ])
  );
}

/* ---------- Etapa 02: persistência com Supabase (CRUD) ---------- */

// READ - listar o time
async function listarTime() {
  if (!supabase) { renderizarTime(); return; }
  const { data, error } = await supabase
    .from("favoritos")
    .select("*")
    .order("criado_em", { ascending: true });
  if (error) {
    console.error("Erro ao listar time:", error);
    listaTime.replaceChildren(el("p", { texto: "Não foi possível carregar o time.", classe: "vazio" }));
    return;
  }
  time = data;
  renderizarTime();
}

// CREATE - salvar um Pokémon no time
async function adicionarAoTime(p) {
  if (!supabase) { alert("Configure o Supabase no script.js primeiro."); return; }
  if (time.length >= MAX_TIME) return;
  const { error } = await supabase.from("favoritos").insert({
    nome_item: p.nome,
    dados_extra: { id: p.id, sprite: p.sprite, tipos: p.tipos },
  });
  if (error) { console.error("Erro ao salvar:", error); alert("Erro ao salvar. Veja o Console (F12)."); return; }
  await listarTime();
  if (pokemonAtual) renderizarCartao(pokemonAtual);
}

// DELETE - remover do time
async function removerDoTime(id) {
  const { error } = await supabase.from("favoritos").delete().eq("id", id);
  if (error) { console.error("Erro ao remover:", error); alert("Erro ao remover. Veja o Console (F12)."); return; }
  await listarTime();
  if (pokemonAtual) renderizarCartao(pokemonAtual);
}

function renderizarTime() {
  contador.textContent = `(${time.length}/${MAX_TIME})`;
  if (time.length === 0) {
    listaTime.replaceChildren(el("p", { texto: "Seu time está vazio. Busque um Pokémon e adicione!", classe: "vazio" }));
    return;
  }
  listaTime.replaceChildren(
    ...time.map((item) => {
      const btn = el("button", { texto: "Remover", classe: "perigo" });
      btn.addEventListener("click", () => removerDoTime(item.id));
      return el("div", { classe: "item-time" }, [
        el("img", { attrs: { src: item.dados_extra?.sprite || "", alt: item.nome_item } }),
        el("strong", { texto: item.nome_item }),
        btn,
      ]);
    })
  );
}

/* ---------- Eventos ---------- */
function disparaBusca() {
  const termo = campoBusca.value.toLowerCase().trim();
  if (termo) buscarPokemon(termo);
}
botaoBuscar.addEventListener("click", disparaBusca);
campoBusca.addEventListener("keydown", (e) => { if (e.key === "Enter") disparaBusca(); });

listarTime();
