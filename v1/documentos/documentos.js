// Documentos Odisse — v1. Monta folhas A4 da marca a partir do conteúdo que cada ferramenta manda.
//
//   import { recursos, montar, imprimir } from 'https://marca.odisse.com.br/v1/documentos/documentos.js';
//   const rec = await recursos();                       // odisse.json + logos (guardados em memória)
//   const n = await montar(elemento, doc, rec);         // desenha as folhas dentro de `elemento` (precisa estar na página)
//   await imprimir(doc, rec, 'CA-2026-0001');           // abre a impressão (Salvar como PDF) só com as folhas
//
// O documento (`doc`) diz só o conteúdo; a folha é decidida aqui:
//   {
//     modelo: 'coluna' | 'ficha',
//     miolo: 'texto' | 'vazio' | 'pontos',              // pontos = quadrícula de 5 mm (levantamentos)
//     codigo: 'CA-2026-0001',                           // aparece nas folhas de continuação
//     campos: [{ rotulo: 'Para', valor: 'Nome\nCargo' }, { rotulo: 'Assunto', valor: '…', largo: true }],
//     titulo, saudacao, paragrafos: ['…'], fecho,
//     assinaturas: [{ nome, cargo, registro }], anexos,
//   }
// Coluna: o primeiro campo vai à esquerda, os outros empilhados à direita, os largos embaixo.
// Ficha: o primeiro campo ocupa o espaço livre, os outros têm 132 px; os largos viram uma linha inteira.
// Texto longo continua em novas folhas (quebra entre parágrafos e, se preciso, dentro do parágrafo).
//
// Regra de versão: ajustes de desenho compatíveis entram aqui; mudar o formato de `doc` = v2/.

const BASE = new URL('../../', import.meta.url).href; // raiz da marca (marca.odisse.com.br/)

// ---- medidas (px, folha de 794 × 1123) --------------------------------------
const L = 794, A = 1123, M = 56, UTIL = L - 2 * M; // 682
const PONTO_X = [28, 766];
const CORPO = { fonte: 15, linha: 23 };
// topo das maiúsculas da primeira linha do corpo, a partir do topo da caixa (Inter: ascendente 0,969; maiúscula 0,7275)
const TOPO_MAIUSC = (CORPO.linha - CORPO.fonte * 1.2109) / 2 + CORPO.fonte * (0.96875 - 0.7275); // ≈ 6,04
const COLUNA = { mao: 56, campos: 160, corpo: 360, esq: 168, x: 264, larg: 474, fimCorpo: 1006, pagina: 1039 };
const FICHA = { assinatura: 330, respiro: 48, entre: 42 };
// logos (coordenadas do viewBox de cada arquivo)
const LOGOTIPO = { vb: [149, 455, 777, 170], topo: 457.07, altura: 164.63 };
const MAO = { vb: [325, 180, 430, 720] };

// ---- recursos -----------------------------------------------------------------
let cache = null;
export async function recursos(base = BASE) {
  if (cache) return cache;
  const texto = (c) => fetch(base + c).then((r) => { if (!r.ok) throw new Error(`marca: ${c} (${r.status})`); return r.text(); });
  const [marca, logotipo, assinatura, mao] = await Promise.all([
    fetch(base + 'odisse.json').then((r) => r.json()),
    texto('logos/logotipo-odisse.svg'),
    texto('logos/odisse-assinatura-horizontal.svg'),
    texto('selos/mao.svg'),
  ]);
  cache = { marca, logotipo: limparSvg(logotipo), assinatura: limparSvg(assinatura), mao: limparSvg(mao) };
  return cache;
}

function limparSvg(t) {
  const doc = new DOMParser().parseFromString(t, 'image/svg+xml');
  const s = doc.documentElement;
  s.removeAttribute('width'); s.removeAttribute('height');
  s.setAttribute('fill', 'currentColor');
  s.setAttribute('aria-hidden', 'true');
  return s;
}

// ---- peças --------------------------------------------------------------------
const el = (tag, cls, estilo = {}, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  Object.assign(e.style, estilo);
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const px = (n) => `${Math.round(n * 100) / 100}px`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const site = (u) => String(u || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

function svg(no, x, y, larg, alt) {
  const s = no.cloneNode(true);
  Object.assign(s.style, { position: 'absolute', left: px(x), top: px(y), width: px(larg), height: px(alt) });
  return s;
}
function logotipo(rec, x, topoMaiusc, larg) {
  const k = larg / LOGOTIPO.vb[2];
  return { no: svg(rec.logotipo, x, topoMaiusc - (LOGOTIPO.topo - LOGOTIPO.vb[1]) * k, larg, LOGOTIPO.vb[3] * k), base: topoMaiusc + LOGOTIPO.altura * k };
}
function mao(rec, x, y, alt) {
  return svg(rec.mao, x, y, alt * MAO.vb[2] / MAO.vb[3], alt);
}
function assinaturaH(rec, x, topoMaiusc, larg) {
  const s = rec.assinatura;
  const vb = s.getAttribute('viewBox').split(/\s+/).map(Number);
  const k = larg / vb[2];
  const capTop = Number(s.dataset.topoMaiusculas ?? s.getAttribute('data-topo-maiusculas'));
  const capH = Number(s.dataset.alturaMaiusculas ?? s.getAttribute('data-altura-maiusculas'));
  return { no: svg(s, x, topoMaiusc - capTop * k, larg, vb[3] * k), alturaMaiusc: capH * k };
}
function pontos(folha, ys) {
  for (const x of PONTO_X) for (const y of ys) folha.append(el('div', 'odd-ponto', { left: px(x - 3.5), top: px(y - 3.5) }));
}
const dados = (rec) => {
  const o = rec.marca, e = o.endereco || {}, c = o.contato || {};
  return {
    endereco: [e.logradouro, [e.bairro, [e.cidade, e.uf].filter(Boolean).join(' – ')].filter(Boolean).join(', '), e.cep && 'CEP ' + e.cep].filter(Boolean),
    contato: [c.telefone, c.email, site(o.sites?.institucional)].filter(Boolean),
    cidade: [e.bairro, [e.cidade, e.uf].filter(Boolean).join(' – ')].filter(Boolean).join(', '),
  };
};
const campoHtml = (c) => `<div class="odd-rotulo">${esc(c.rotulo)}</div><div class="odd-valor">${esc(c.valor)}</div>`;

// ---- folhas -------------------------------------------------------------------
function folhaColuna(rec, doc, primeira) {
  const f = el('div', 'odd-folha');
  pontos(f, [COLUNA.mao + 28, A / 2, COLUNA.pagina]);
  f.append(mao(rec, M, COLUNA.mao, 56));
  let topoCorpo = COLUNA.campos;
  if (primeira) {
    const topoLogo = COLUNA.corpo + TOPO_MAIUSC;
    const lg = logotipo(rec, M, topoLogo, COLUNA.esq);
    f.append(lg.no);
    f._logo = lg.no;
    const d = dados(rec);
    f._endereco = el('div', 'odd-abs odd-pequeno', { left: px(M), top: px(Math.round(lg.base + 24)), width: '200px' },
      esc(d.endereco.join('\n')).replace(/\n/g, '<br>') + '<div style="height:17px"></div>' + esc(d.contato.join('\n')).replace(/\n/g, '<br>'));
    f.append(f._endereco);
    const campos = doc.campos || [];
    if (campos.length) {
      const curtos = campos.filter((c) => !c.largo), largos = campos.filter((c) => c.largo);
      const g = el('div', 'odd-abs odd-pequeno odd-campos-coluna', { left: px(COLUNA.x), top: px(COLUNA.campos), width: px(COLUNA.larg) });
      if (curtos[0]) g.append(el('div', '', {}, campoHtml(curtos[0])));
      if (curtos.length > 1) {
        const p = el('div', 'odd-pilha');
        curtos.slice(1).forEach((c) => p.append(el('div', '', {}, campoHtml(c))));
        g.append(p);
      }
      largos.forEach((c) => g.append(el('div', 'odd-largo', {}, campoHtml(c))));
      f._campos = g;
      f.append(g);
    }
    topoCorpo = COLUNA.corpo;
  }
  const corpo = el('div', 'odd-corpo', { left: px(COLUNA.x), width: px(COLUNA.larg), top: px(topoCorpo), height: px(COLUNA.fimCorpo - topoCorpo) });
  f._corpo = corpo;
  if (doc.miolo === 'texto') f.append(corpo);
  f._numerar = (n, total) => {
    const linhas = [];
    if (n > 1 && doc.codigo) linhas.push(esc(doc.codigo));
    if (doc.miolo === 'texto' || total > 1) linhas.push(`Página ${n} de ${total}`);
    if (!linhas.length) return;
    f.append(el('div', 'odd-abs odd-pequeno', { left: px(M), top: px(COLUNA.pagina + 8.5 - 17 * linhas.length), width: '180px' }, linhas.join('<br>')));
  };
  return f;
}

function folhaFicha(rec, doc, primeira) {
  const f = el('div', 'odd-folha');
  const as = assinaturaH(rec, M, M, FICHA.assinatura);
  f.append(as.no);
  const meio = M + as.alturaMaiusc / 2, pe = A - meio;
  pontos(f, [meio, A / 2, pe]);
  // rodapé centrado no ponto de baixo
  const d = dados(rec), rt = pe - 17;
  f.append(el('div', 'odd-filete', { left: px(M), top: px(Math.round(rt - 16)), width: px(UTIL) }));
  const o = rec.marca;
  f.append(el('div', 'odd-abs odd-pequeno', { left: px(M), top: px(rt), width: '220px' }, `${esc(o.nome)}<br>${esc(site(o.sites?.institucional))}`));
  f.append(el('div', 'odd-abs odd-pequeno', { left: '300px', top: px(rt), width: '220px' }, `${esc(o.endereco?.logradouro)}<br>${esc(d.cidade)}`));
  f.append(el('div', 'odd-abs odd-pequeno', { left: '520px', top: px(rt), width: '180px' }, `${esc(o.contato?.telefone)}<br>${esc(o.contato?.email)}`));
  f.append(mao(rec, L - M - 34 * MAO.vb[2] / MAO.vb[3], rt, 34));
  const topoTabela = Math.round(M + as.alturaMaiusc + FICHA.respiro);
  const fim = Math.round(rt - 16 - FICHA.respiro);
  let campos = doc.campos || [];
  if (!primeira) campos = [{ rotulo: 'Nº', valor: doc.codigo || '' }, { rotulo: 'Continuação', valor: '' }];
  let topoCorpo = topoTabela;
  if (campos.length) {
    const curtos = campos.filter((c) => !c.largo), largos = campos.filter((c) => c.largo);
    const t = el('div', 'odd-abs odd-tabela', { left: px(M), top: px(topoTabela), width: px(UTIL),
      gridTemplateColumns: curtos.length ? ['1fr', ...curtos.slice(1).map(() => '132px')].join(' ') : '1fr' });
    curtos.forEach((c) => t.append(el('div', '', {}, campoHtml(c))));
    largos.forEach((c) => t.append(el('div', 'odd-largo', {}, campoHtml(c))));
    f.append(t);
    f._tabela = t;
    f._continua = !primeira ? t.lastChild.querySelector('.odd-valor') : null;
  }
  f._ajustar = () => { // depois de medir a tabela
    const tb = f._tabela ? f._tabela.offsetHeight : 0;
    topoCorpo = topoTabela + (tb ? tb + FICHA.entre : 0);
    if (f._corpo) Object.assign(f._corpo.style, { top: px(topoCorpo), height: px(fim - topoCorpo) });
    if (f._grade) {
      const c = 18.9, n = Math.floor((fim - topoCorpo) / c), larg = c * 36, alt = c * n;
      Object.assign(f._grade.style, { left: px(M + (UTIL - larg) / 2 - 0.5), top: px(topoCorpo), width: px(larg + 1), height: px(alt + 1),
        backgroundSize: `${c * 5}px ${c * 5}px, ${c}px ${c}px`, backgroundPosition: `${-(c * 2.5 - 0.5)}px ${-(c * 2.5 - 0.5)}px, ${-(c / 2 - 0.5)}px ${-(c / 2 - 0.5)}px` });
    }
  };
  if (doc.miolo === 'pontos') { f._grade = el('div', 'odd-pontos'); f.append(f._grade); }
  else f._corpo = el('div', 'odd-corpo', { left: px(M), width: px(UTIL) });
  if (f._corpo) f.append(f._corpo);
  f._numerar = (n, total) => {
    if (f._continua) f._continua.textContent = `Página ${n} de ${total}`;
    else if (total > 1) f.append(el('div', 'odd-abs odd-pequeno', { right: px(M), top: px(Math.round(rt - 16 - 26)), textAlign: 'right' }, `Página ${n} de ${total}`));
  };
  return f;
}

// ---- texto em blocos ------------------------------------------------------------
function blocos(doc) {
  const b = [];
  if (doc.titulo) b.push({ html: `<h1 class="odd-titulo">${esc(doc.titulo)}</h1>`, inteiro: true, comProximo: true });
  if (doc.saudacao) b.push({ texto: doc.saudacao });
  for (const p of doc.paragrafos || []) if (String(p).trim()) b.push({ texto: String(p).trim() });
  const ass = (doc.assinaturas || []).filter((a) => a && (a.nome || a.cargo));
  if (doc.fecho || ass.length) {
    b.push({ inteiro: true, html: (doc.fecho ? `<p class="odd-fecho">${esc(doc.fecho)}</p>` : '') +
      (ass.length ? `<div class="odd-assinaturas">${ass.map((a) => `<div>${a.nome ? `<b>${esc(a.nome)}</b><br>` : ''}${[a.cargo, a.registro].filter(Boolean).map(esc).join(' · ')}</div>`).join('')}</div>` : '') });
  }
  if (doc.anexos) b.push({ inteiro: true, html: `<div class="odd-anexos"><b>Anexos</b>\n${esc(doc.anexos)}</div>` });
  return b;
}
const noDe = (bl) => {
  if (bl.html) { const d = el('div'); d.innerHTML = bl.html; return d.childElementCount === 1 ? d.firstElementChild : d; }
  const p = el('p'); p.textContent = bl.texto; return p;
};
const transborda = (c) => c.scrollHeight > c.clientHeight + 0.5;

// ---- montar ---------------------------------------------------------------------
export async function montar(alvo, doc, rec) {
  rec = rec || await recursos();
  if (document.fonts) {
    await Promise.all(['400 15px Inter', '600 15px Inter', '600 10px Inter'].map((f) => document.fonts.load(f).catch(() => {})));
  }
  alvo.replaceChildren();
  const nova = (primeira) => {
    const f = (doc.modelo === 'ficha' ? folhaFicha : folhaColuna)(rec, doc, primeira);
    alvo.append(f);
    if (f._ajustar) f._ajustar();
    // Coluna: campos altos empurram o corpo para baixo
    if (primeira && f._campos && f._corpo) {
      const fimCampos = COLUNA.campos + f._campos.offsetHeight + 40;
      if (fimCampos > COLUNA.corpo) {
        // o logotipo desce junto: o topo do ODISSE continua na linha do topo do corpo
        const desce = fimCampos - COLUNA.corpo;
        Object.assign(f._corpo.style, { top: px(fimCampos), height: px(COLUNA.fimCorpo - fimCampos) });
        for (const no of [f._logo, f._endereco]) no.style.top = px(parseFloat(no.style.top) + desce);
      }
    }
    return f;
  };
  const folhas = [nova(true)];
  if (doc.miolo === 'texto') {
    const fila = blocos(doc);
    let corpo = folhas[0]._corpo;
    while (fila.length) {
      const bl = fila.shift();
      const no = noDe(bl);
      corpo.append(no);
      if (!transborda(corpo)) {
        // título fica com o parágrafo seguinte
        if (bl.comProximo && fila.length) {
          const prox = noDe(fila[0]); corpo.append(prox);
          const cabe = !transborda(corpo); prox.remove();
          if (!cabe && corpo.childElementCount > 1) { no.remove(); fila.unshift(bl); corpo = proxima(); }
        }
        continue;
      }
      no.remove();
      if (bl.texto) {
        // parte do parágrafo que cabe nesta folha
        const palavras = bl.texto.split(/\s+/);
        const p = el('p'); corpo.append(p);
        let lo = 0, hi = palavras.length;
        while (lo < hi) {
          const meio = Math.ceil((lo + hi) / 2);
          p.textContent = palavras.slice(0, meio).join(' ');
          if (transborda(corpo)) hi = meio - 1; else lo = meio;
        }
        if (lo >= 3 || (lo > 0 && corpo.childElementCount === 1)) {
          p.textContent = palavras.slice(0, lo).join(' ');
          fila.unshift({ texto: palavras.slice(lo).join(' ') });
        } else {
          p.remove();
          fila.unshift(bl);
        }
      } else {
        fila.unshift(bl);
      }
      if (corpo.childElementCount === 0) { corpo.append(noDe(fila.shift())); } // nem numa folha vazia cabe: vai assim mesmo
      corpo = proxima();
    }
    function proxima() { const f = nova(false); folhas.push(f); return f._corpo; }
    // última folha vazia (sobrou só quebra): tira
    while (folhas.length > 1 && !folhas.at(-1)._corpo.childElementCount) folhas.pop().remove();
  }
  folhas.forEach((f, i) => f._numerar(i + 1, folhas.length));
  return folhas.length;
}

// ---- imprimir (Salvar como PDF) ---------------------------------------------------
export async function imprimir(doc, rec, nomeArquivo) {
  const caixa = el('div', 'odd-impressao');
  caixa.style.cssText = 'display:block;position:fixed;left:-10000px;top:0;';
  document.body.append(caixa);
  try {
    await montar(caixa, doc, rec);
    caixa.style.cssText = '';
    const titulo = document.title;
    if (nomeArquivo) document.title = nomeArquivo;
    document.body.classList.add('odd-imprimindo');
    await new Promise((ok) => {
      const fim = () => { window.removeEventListener('afterprint', fim); ok(); };
      window.addEventListener('afterprint', fim);
      window.print();
      setTimeout(fim, 60000); // navegadores que não disparam afterprint
    });
    document.title = titulo;
  } finally {
    document.body.classList.remove('odd-imprimindo');
    caixa.remove();
  }
}

export const MEDIDAS = { L, A, M, UTIL, COLUNA, FICHA, CORPO };
