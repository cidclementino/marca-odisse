# Marca Odisse

Fonte única da marca do **Odisse, Estúdio de Arquitetura e Design**: logos, selos, favicon, cores, tipografia e dados institucionais. Todos os sites e ferramentas leem daqui, inclusive os públicos (odisse.com.br, projetos, Herma) e o Universo.

Publicado em **https://marca.odisse.com.br** (GitHub Pages). A página inicial mostra tudo e serve de consulta.

## O que tem aqui

| Caminho | Conteúdo |
|---|---|
| `odisse.json` | Dados institucionais (nome, descrição, contato, endereço, redes, sites), paleta com a função de cada cor, papéis básicos e núcleos (sigla, cores, canais, selo e logos). Textos que se traduzem têm a versão `_en` ao lado |
| `v1/marca.css` | Variáveis de cor, papéis básicos, cores por núcleo e a fonte Inter. Os valores seguem o `odisse.json`: quando a paleta muda pelo Universo, o mesmo commit reescreve estas linhas |
| `v1/fontes/` | Inter variável (woff2), carregada pelo `marca.css` |
| `logos/` | Logos dos núcleos, listados em `nucleos[].logos` do `odisse.json`. Estúdio: completo, 01 (`logotipo-odisse.svg`, uma cor, `currentColor`) e 02 (mão). O caminho `logotipo-odisse.svg` não muda: barra do Universo, Orçamentos e Projetos usam. Regularizado em 18/11/2026: altura das maiúsculas única (topo 457,07, base 621,70), O e S com ultrapassagem de 2 unidades, curva interna do D refeita; viewBox `149 455 777 170` |
| `logos/odisse-assinatura-horizontal.svg`, `logos/odisse-assinatura-vertical.svg` | Assinatura completa (ODISSE + "Estúdio de Arquitetura e Design", em Inter Medium vetorizada). Horizontal: o descritor vai do topo à base do ODISSE. Vertical: ARQUITETURA mede metade da largura do ODISSE, alinhada à esquerda. Os atributos `data-topo-maiusculas` e `data-altura-maiusculas` dizem onde está a altura das maiúsculas dentro do viewBox |
| `v1/documentos/` | Folhas A4 da marca (Coluna e Ficha), montadas a partir do conteúdo que cada ferramenta manda. Ver "Documentos" abaixo |
| `selos/` | Selos de uma cor: Mão (Estúdio e posts únicos), Roda (Arquitetos), Flor (Objetos), Sol (Elaia). `selos/mao.svg` é usado por outras ferramentas: o caminho não muda |
| `favicon/` | Conjunto de favicons |

## Como usar

```html
<link rel="stylesheet" href="https://marca.odisse.com.br/v1/marca.css">
<link rel="icon" href="https://marca.odisse.com.br/favicon/favicon.svg" type="image/svg+xml">
```

```js
const odisse = await fetch('https://marca.odisse.com.br/odisse.json').then(r => r.json());
```

Os sites públicos usam só esta camada (marca). As ferramentas internas do Universo usam esta camada mais a camada de interface do próprio Universo.

## Documentos

```html
<link rel="stylesheet" href="https://marca.odisse.com.br/v1/documentos/documentos.css">
<script type="module">
  import { recursos, montar, imprimir } from 'https://marca.odisse.com.br/v1/documentos/documentos.js';
  const rec = await recursos();
  await montar(elemento, doc, rec);   // prévia (o elemento precisa estar na página)
  await imprimir(doc, rec, 'CA-2026-0001 Assunto');   // janela de impressão: "Salvar como PDF"
</script>
```

O desenho mora aqui; o conteúdo, em cada ferramenta (o Universo guarda cartas, ofícios, declarações e memorandos; o vendas e o Projetos vão usar a mesma folha). O formato de `doc` está no topo do `documentos.js`:

- **Coluna** (comunicados): Mão no topo, logotipo ODISSE na coluna esquerda com o topo das maiúsculas na linha do topo do corpo, endereço e contatos embaixo; campos e texto na coluna direita; paginação no pé da coluna esquerda.
- **Ficha**: assinatura horizontal no topo, tabela de campos fechada (o primeiro campo ocupa o espaço livre; os largos viram uma linha inteira), corpo ou quadrícula de pontos de 5 mm, rodapé com contatos e a Mão.
- Seis pontos laterais (três de cada lado, na meia-margem), como no site e nos posts.
- Texto longo continua em novas folhas: quebra entre parágrafos e, se preciso, dentro do parágrafo.
- **Blocos** (`doc.blocos`): seção, parágrafo (com opção negrito), lista (travessão ou numerada), tabela (alinhamento e largura por coluna, linha de total), cláusula (número, título, parágrafos e itens) e nota. A tabela quebra entre linhas e repete o cabeçalho; título de seção e de cláusula não ficam sozinhos no pé.
- Os modelos são vistos e conferidos no Universo, em Biblioteca › Documentos; este site não mostra os documentos.
- Folha de 794 × 1123 px (A4 a 96 px/pol). Na impressão, `@page { size: A4; margin: 0 }`.

## Regras

- **Versão no caminho do CSS.** Ajustes compatíveis (afinar uma cor) entram em `v1/`. Renomear ou remover variável = nova pasta `v2/`; `v1/` continua no ar até nenhum site depender dela.
- **Só arquivos prontos para a web.** Originais (`.ai`, `.psd`, PDF da paleta) ficam no Drive, em `[Imagem]/0-marca`.
- **SVGs limpos.** Sem scripts, sem links externos, sem metadados de editor.
- **Fotos e vídeos não entram aqui.** Vão para o acervo do Universo (armazenamento de arquivos), não para o git.
- Edição pelo Universo (página Marca): dados, cores e envio de logos viram commits neste repositório, com histórico. O Estúdio é a própria marca-mãe (`marca_mae: true`).
- Ids de núcleo e de cor não mudam (os sites dependem deles); nomes de cor também ficam fixos, porque viram variáveis do CSS.

A fonte Inter é distribuída sob a SIL Open Font License 1.1.
