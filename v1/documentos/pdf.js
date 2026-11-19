// Documentos Odisse — v1 · desenhista de PDF.
// Desenha em PDF (texto selecionável) as mesmas folhas que o montador (documentos.js) monta na tela:
// monta o documento fora da vista, lê a posição de cada linha de texto, filete, ponto e logo, e repete tudo
// num PDF A4. Por ler as folhas já montadas, acompanha sozinho qualquer ajuste de desenho feito aqui na Marca.
//
//   import { pdf } from 'https://marca.odisse.com.br/v1/documentos/pdf.js';
//   const blob = await pdf(doc, rec, { jsPDF, fontes: { normal: base64Ttf, negrito: base64Ttf } });
//
// `doc` é o mesmo do montador (modelo, campos, blocos, assinaturas…). jsPDF vem de quem chama (a ferramenta
// já o carrega); `fontes` são a Inter em TTF (base64). Peso 600 ou mais sai em negrito.
// A página precisa carregar documentos.css (o desenho das folhas).

import { montar, recursos, MEDIDAS } from './documentos.js';

const K = 595.28 / MEDIDAS.L;          // px da folha → pt do A4
const ESCALA_IMG = 4;                  // logos e rubricas em 4× (nítidos na impressão)

function rgba(cor) {
  const m = String(cor).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}
// cor com transparência vira a cor já misturada com o papel (o PDF não precisa de camadas)
function solida(cor, fundo) {
  const c = rgba(cor);
  if (!c || c.a === 0) return null;
  if (c.a >= 1 || !fundo) return [c.r, c.g, c.b];
  return [0, 1, 2].map((i) => Math.round([c.r, c.g, c.b][i] * c.a + fundo[i] * (1 - c.a)));
}

async function imagemDe(no, larg, alt, cor) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(larg * ESCALA_IMG)); c.height = Math.max(1, Math.round(alt * ESCALA_IMG));
  const g = c.getContext('2d');
  let src;
  if (no.tagName.toLowerCase() === 'svg') {
    const s = no.cloneNode(true);
    s.setAttribute('width', c.width); s.setAttribute('height', c.height);
    s.removeAttribute('style');
    s.setAttribute('fill', cor);
    s.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(s).replace(/currentColor/g, cor));
  } else src = no.currentSrc || no.src;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((ok, erro) => { img.onload = ok; img.onerror = erro; img.src = src; });
  if (no.tagName.toLowerCase() === 'img') {
    // object-fit: contain, à esquerda (rubrica)
    const r = Math.min(c.width / img.naturalWidth, c.height / img.naturalHeight);
    g.drawImage(img, 0, (c.height - img.naturalHeight * r) / 2, img.naturalWidth * r, img.naturalHeight * r);
  } else g.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

// linhas de um nó de texto: agrupa as palavras pela altura em que caíram na folha
function linhasDe(no) {
  const texto = no.nodeValue;
  const r = document.createRange();
  const linhas = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(texto))) {
    r.setStart(no, m.index); r.setEnd(no, m.index + m[0].length);
    const rects = [...r.getClientRects()].filter((x) => x.width > 0);
    if (!rects.length) continue;
    const q = rects[0];
    const ult = linhas[linhas.length - 1];
    if (ult && Math.abs(ult.top - q.top) < 2) { ult.fim = m.index + m[0].length; ult.right = q.right; }
    else linhas.push({ ini: m.index, fim: m.index + m[0].length, left: q.left, right: q.right, top: q.top, height: q.height });
  }
  return linhas.map((l) => ({ ...l, texto: texto.slice(l.ini, l.fim).replace(/\s+/g, ' ') }));
}

const transformar = (t, modo) => modo === 'uppercase' ? t.toLocaleUpperCase('pt-BR') : modo === 'lowercase' ? t.toLocaleLowerCase('pt-BR') : t;

async function desenharFolha(pdf, folha, fundoPapel) {
  const base = folha.getBoundingClientRect();
  const X = (v) => (v - base.left) * K, Y = (v) => (v - base.top) * K;
  pdf.setFillColor(...fundoPapel);
  pdf.rect(0, 0, MEDIDAS.L * K, MEDIDAS.A * K, 'F');

  // caixas: fundos, bordas, pontos
  for (const e of folha.querySelectorAll('*')) {
    if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const q = e.getBoundingClientRect();
    if (!q.width || !q.height) continue;
    const op = Number(cs.opacity) < 1 ? Number(cs.opacity) : 1;
    const misturar = (cor) => { const c = solida(cor, fundoPapel); return c && op < 1 ? c.map((v, i) => Math.round(v * op + fundoPapel[i] * (1 - op))) : c; };
    const fundo = misturar(cs.backgroundColor);
    if (fundo && fundo.join() !== fundoPapel.join()) {
      pdf.setFillColor(...fundo);
      if (parseFloat(cs.borderTopLeftRadius) >= q.width / 2 - 0.5) pdf.circle(X(q.left + q.width / 2), Y(q.top + q.height / 2), (q.width / 2) * K, 'F');
      else pdf.rect(X(q.left), Y(q.top), q.width * K, q.height * K, 'F');
    }
    for (const [lado, x1, y1, x2, y2] of [
      ['Top', q.left, q.top, q.right, q.top], ['Bottom', q.left, q.bottom, q.right, q.bottom],
      ['Left', q.left, q.top, q.left, q.bottom], ['Right', q.right, q.top, q.right, q.bottom]]) {
      const w = parseFloat(cs[`border${lado}Width`]);
      const estilo = cs[`border${lado}Style`];
      if (!w || estilo === 'none' || estilo === 'hidden') continue;
      const cor = misturar(cs[`border${lado}Color`]);
      if (!cor) continue;
      const meio = w / 2;
      const [a, b, c, d] = lado === 'Top' ? [x1, y1 + meio, x2, y2 + meio] : lado === 'Bottom' ? [x1, y1 - meio, x2, y2 - meio]
        : lado === 'Left' ? [x1 + meio, y1, x2 + meio, y2] : [x1 - meio, y1, x2 - meio, y2];
      pdf.setDrawColor(...cor); pdf.setLineWidth(w * K);
      pdf.setLineDashPattern(estilo === 'dashed' ? [3 * K, 2 * K] : estilo === 'dotted' ? [w * K, w * K] : [], 0);
      pdf.line(X(a), Y(b), X(c), Y(d));
    }
  }
  pdf.setLineDashPattern([], 0);

  // logos (svg) e rubricas (img)
  for (const e of folha.querySelectorAll('svg, img')) {
    if (e.tagName.toLowerCase() === 'svg' && e.parentElement.closest('svg')) continue;
    const q = e.getBoundingClientRect();
    if (!q.width || !q.height) continue;
    const cs = getComputedStyle(e);
    const cor = solida(cs.color, fundoPapel) || [63, 75, 87];
    try {
      const png = await imagemDe(e, q.width, q.height, `rgb(${cor.join(',')})`);
      pdf.addImage(png, 'PNG', X(q.left), Y(q.top), q.width * K, q.height * K, undefined, 'FAST');
    } catch (err) { console.warn('pdf: imagem', err); }
  }

  // texto, linha a linha, na posição em que ficou na folha
  const andar = document.createTreeWalker(folha, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => n.nodeValue.trim() && !n.parentElement.closest('svg') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  for (let n = andar.nextNode(); n; n = andar.nextNode()) {
    const cs = getComputedStyle(n.parentElement);
    if (cs.visibility === 'hidden') continue;
    const tam = parseFloat(cs.fontSize);
    const peso = Number(cs.fontWeight) >= 600 ? 'bold' : 'normal';
    const op = Number(cs.opacity) < 1 ? Number(cs.opacity) : 1;
    let cor = solida(cs.color, fundoPapel) || [63, 75, 87];
    if (op < 1) cor = cor.map((v, i) => Math.round(v * op + fundoPapel[i] * (1 - op)));
    const espaco = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) || 0;
    pdf.setFont('Inter', peso); pdf.setFontSize(tam * K); pdf.setTextColor(...cor);
    for (const l of linhasDe(n)) {
      const texto = transformar(l.texto, cs.textTransform);
      // linha de base: topo da caixa da fonte + ascendente da Inter (0,969 do corpo)
      const meioCaixa = l.top + l.height / 2;
      const linhaBase = meioCaixa - (tam * 1.2109) / 2 + tam * 0.96875;
      const opcoes = { baseline: 'alphabetic' };
      if (espaco) opcoes.charSpace = espaco * K;
      pdf.text(texto, X(l.left), Y(linhaBase), opcoes);
    }
  }
}

export async function pdf(doc, rec, { jsPDF, fontes } = {}) {
  if (!jsPDF) throw new Error('pdf: falta o jsPDF');
  rec = rec || await recursos();
  const caixa = document.createElement('div');
  caixa.setAttribute('aria-hidden', 'true');
  caixa.style.cssText = 'position:fixed;left:-20000px;top:0;width:794px;pointer-events:none;';
  document.body.append(caixa);
  try {
    await montar(caixa, doc, rec);
    await Promise.all([...caixa.querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
    const saida = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    if (fontes && fontes.normal) {
      saida.addFileToVFS('Inter-Regular.ttf', fontes.normal); saida.addFont('Inter-Regular.ttf', 'Inter', 'normal');
      saida.addFileToVFS('Inter-Bold.ttf', fontes.negrito || fontes.normal); saida.addFont('Inter-Bold.ttf', 'Inter', 'bold');
    } else throw new Error('pdf: faltam as fontes (Inter em TTF)');
    const folhas = [...caixa.querySelectorAll('.odd-folha')];
    const papel = solida(getComputedStyle(folhas[0]).backgroundColor) || [250, 250, 247];
    for (const [i, f] of folhas.entries()) {
      if (i) saida.addPage('a4', 'portrait');
      await desenharFolha(saida, f, papel);
    }
    if (doc.titulo || doc.codigo) saida.setProperties({ title: [doc.codigo, doc.titulo].filter(Boolean).join(' · '), creator: 'Odisse' });
    return saida.output('blob');
  } finally {
    caixa.remove();
  }
}
