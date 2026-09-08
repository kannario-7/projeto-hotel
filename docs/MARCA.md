# Marca — HospedaPrime

Guia de identidade visual do HospedaPrime (identidade V2). Serve como
referência única para o site público, a página de reservas e o sistema.

---

## Símbolo

O símbolo é a letra **H** formada por três traços de mesma espessura e pontas
semicirculares. As duas hastes verticais assumem a cor do contexto (Tinta no
claro, Névoa no escuro) e a travessa central é sempre **Coral**, posicionada a
62% da altura a partir do topo.

Arquivos oficiais (em `app/img/`):

| Arquivo | Uso |
|---|---|
| `logo-h.svg` | Símbolo H (63×75). Hastes em `currentColor`, travessa coral. Escala em qualquer tamanho e herda a cor do texto ao redor. |
| `logo-h-solido.svg` | Versão em bloco arredondado (64×64), fundo Tinta, H em Névoa. Usada como favicon e avatar. |

No código, o símbolo aparece de duas formas:
- **SVG inline** no cabeçalho/rodapé do site e na sidebar do app (herda a cor via `currentColor`).
- **Arquivo** `logo-h-solido.svg` como favicon (`<link rel="icon">`).

### Regras de uso do símbolo
- A travessa é **sempre** Coral (`#FF5C35`). Não trocar por outra cor.
- As hastes acompanham o fundo: Tinta sobre claro, Névoa sobre escuro.
- Manter a proporção original. Não distorcer, inclinar ou aplicar sombra.
- Respeitar uma margem de respiro ao redor equivalente à largura de uma haste.

---

## Paleta

| Nome | Hex | RGB | Papel |
|---|---|---|---|
| **Tinta** | `#14141C` | 20, 20, 28 | Fundo escuro, texto sobre claro |
| **Coral** | `#FF5C35` | 255, 92, 53 | Destaque (botões, travessa do H, barras, números em foco). ~ Pantone 172 C |
| **Grafite** | `#6B6B7B` | 107, 107, 123 | Texto secundário, legendas |
| **Névoa** | `#F7F7F5` | 247, 247, 245 | Fundo claro, texto sobre escuro |

O Coral entra **só como destaque** — não é cor de fundo de grandes áreas. Use-o
em botões principais, na travessa do símbolo, em barras de ocupação e em números
que merecem foco.

### Como está no código (`landing.css`)

```css
--bg:#14141C;            /* Tinta */
--coral:#FF5C35;         /* Coral */
--grafite:#6B6B7B;       /* Grafite */
--nevoa:#F7F7F5;         /* Névoa */
--text:#F7F7F5;          /* texto sobre escuro = Névoa */
--text-mute:#6B6B7B;     /* texto discreto = Grafite */
```

---

## Tipografia

**Plus Jakarta Sans** (Google Fonts, licença SIL OFL). Fonte de apoio para
corpo longo: DM Sans.

| Peso | Uso |
|---|---|
| **800** | Display / títulos grandes (hero, seções) |
| **700** | Títulos menores, etiquetas e o nome "HospedaPrime" |
| **500** | Corpo de texto |

- **Entreletra negativa obrigatória** nos pesos 700 e 800 (ex.: `letter-spacing:-0.03em` a `-0.04em`).
- Não usar pesos fora dos três autorizados (800 / 700 / 500).

---

## Aplicação

- **Site público** (`index.html`, `guias.html`, `landing.css`): fundo Tinta, texto Névoa, destaques Coral.
- **Sistema** (`app/`): mesmo par claro/escuro, com o Coral como acento em ocupação, botões e KPIs.
- **Zero emoji**: ícones sempre em SVG (traço, estilo linha). Emojis não fazem parte da identidade.

---

## Observações

- As imagens `app/img/_*.png` (com prefixo `_`) são capturas de revisão das
  páginas e **não** são assets de produto — não devem ser publicadas.
- Ao adicionar novos ícones, seguir o padrão de traço já usado nos cards de
  recursos (linha, `stroke-width:2`, pontas arredondadas).
