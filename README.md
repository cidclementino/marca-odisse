# Marca Odisse

Fonte única da marca do **Odisse, Estúdio de Arquitetura e Design**: logos, selos, favicon, cores, tipografia e dados institucionais. Todos os sites e ferramentas leem daqui, inclusive os públicos (odisse.com.br, projetos, Herma) e o Universo.

Publicado em **https://marca.odisse.com.br** (GitHub Pages). A página inicial mostra tudo e serve de consulta.

## O que tem aqui

| Caminho | Conteúdo |
|---|---|
| `odisse.json` | Dados institucionais: nome, descrição, contato, endereço, redes, sites, núcleos |
| `v1/marca.css` | Variáveis de cor, papéis básicos, cores por núcleo e a fonte Inter |
| `v1/fontes/` | Inter variável (woff2), carregada pelo `marca.css` |
| `logos/` | Logo completo, logotipos de uma cor (`logotipo-*.svg`, em `currentColor`) e assinaturas quadradas dos núcleos |
| `selos/` | Selos de uma cor: mão (Estúdio), roda (Arquitetos), flor (Objetos), sol (Elaia) |
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

## Regras

- **Versão no caminho do CSS.** Ajustes compatíveis (afinar uma cor) entram em `v1/`. Renomear ou remover variável = nova pasta `v2/`; `v1/` continua no ar até nenhum site depender dela.
- **Só arquivos prontos para a web.** Originais (`.ai`, `.psd`, PDF da paleta) ficam no Drive, em `[Imagem]/0-marca`.
- **SVGs limpos.** Sem scripts, sem links externos, sem metadados de editor.
- **Fotos e vídeos não entram aqui.** Vão para o acervo do Universo (armazenamento de arquivos), não para o git.
- Edição futura pelo Universo (página Marca): dados e logos viram commits neste repositório, com histórico.

A fonte Inter é distribuída sob a SIL Open Font License 1.1.
