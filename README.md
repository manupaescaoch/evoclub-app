# APP EVO CLUB 

Build a mobile fitness app for Iron Lifting Club, a premium gym brand. The app is in Brazilian Portuguese. Max width 390px, mobile-first.

BRAND IDENTITY

Primary: #1400FF (royal blue)

Background: #F4F5FA (light gray)

Cards: white #FFFFFF with subtle shadow and rgba(0,0,0,0.07) border

Text: #0A0A1A

Muted: #6B7280

Fonts: Barlow Condensed (headings, bold numbers) + DM Sans (body)

Logo: spartan helmet icon in blue

NAVIGATION — bottom tab bar, 5 tabs: Início · Grade · Treino · Comunidade · Ranking

Active tab: blue indicator bar on top + blue icon. Inactive: gray.

TAB 1 — INÍCIO (Dashboard)

Header: logo + bell icon + avatar initials (top)

4 sections in order:

1. Total de Treinos — full-width hero card, blue gradient (#1400FF → #0A00B0), box-shadow blue. Shows:

Label "TOTAL DE TREINOS" small uppercase muted white

Large number "198" (52px bold)

Subtitle: "desde Jan/2024 · média 5.2/semana"

3-column mini stats row below (semi-transparent bg): Peso atual 88.4kg / XP Total 205pts / Streak 3 dias

2. Semana Ativa — white card. Shows:

Header row: "SEMANA ATUAL" label + badge "1/5 concluídos" in blue

7-day circles (Seg–Dom): completed = blue fill ✓, today = blue outline filled, future = light gray

Progress bar below circles (20% filled, blue gradient)

3. XP do Dia — white card horizontal. Shows:

Lightning icon in blue square on left

Label "XP DO DIA" + progress bar (68%) + "+10 pts" in blue bold

Subtitle "68 de 100 XP diários concluídos"

4. Treino de Hoje — white card, left blue border 4px. Shows:

Header: "TREINO DE HOJE" + filled blue pill tag "COSTAS"

Title "Costas & Bíceps" bold 18px

Row: "8 exercícios · 28 séries · ~65 min" in muted

Footer row: "Ver treino completo →" in blue + badge "3/8 ✓" in light blue bg

TAB 2 — GRADE

Header (sticky white): title "GRADE DE AULAS" + subtitle "Iron Lifting Club"

Day selector: horizontal scroll pills (Seg–Dom). Active = blue filled, inactive = gray.

Timeline list (05:00 to 22:00, 18 classes, 1h each, all "Musculação"):

Left axis: time label + vertical line (blue if current hour)

Card per class: name "Musculação" + "Prof. [name] · 60 min" + slots indicator + "Reservar" button (blue)

Slots: always 14 vagas, green dot + "14 vagas" label

Peak hours badge (06–09h and 17–20h): yellow pill "HORÁRIO NOBRE"

Current hour card: blue left border + light blue background

Trainers rotate: André, Carla, Julia, Pedro, Fernanda

TAB 3 — TREINO

Header: "TREINOS DA SEMANA"

Stats row (3 cards): Concluídos 1/5 · Volume 14.2t · Streak 3 dias

Workout list (Mon–Fri):

SEG Peito & Tríceps — done (strikethrough, faded)

TER Costas & Bíceps — TODAY (blue tinted card, "HOJE" pill top right in blue, blue square icon with day label)

QUA Pernas / QUI Ombros & Trapézio / SEX Braços & Abdômen — upcoming (white cards)

Click on TODAY card → drill-down screen:

Back button + title "COSTAS & BÍCEPS"

Progress bar 3/8 with subtitle

Exercise list (8 items): first 3 done (blue ✓ circle, strikethrough, blue bg), remaining numbered

Each row: name + sets · load · rest time

TAB 4 — COMUNIDADE

Header: "COMUNIDADE"

Online now card: "24 membros" + stacked avatar circles (blue gradient) + "+20"

Feed section label "FEED RECENTE" + list of posts:

Avatar + name + timestamp + message text

Like button (❤️ count) + comment button

Thin divider between content and actions

TAB 5 — RANKING

Header: "RANKING 🏆🔥"

Tab switcher: Semana / Mês / Ano (pill switcher, white bg, active = white card elevated)

Minha posição — full blue gradient card: avatar + name + position + XP + treinos count + streak

Pódio visual — 3-column podium inside light blue card:

#1 center (tallest gold platform, crown icon above avatar, 54px avatar)

#2 left (silver platform, 44px avatar)

#3 right (bronze platform, 40px avatar)

Each column: avatar + first name + XP below avatar, medal emoji + position number on platform

Base line: blue gradient bar across full width

Classificação completa — card list below:

Each card: position number (gold/silver/bronze colored for top 3) + avatar + full name + "VOCÊ" pill if me + treinos + streak + XP number right-aligned

XP progress bar inside each card (blue for "me", gray for others)

"Me" card: light blue background + blue border

GENERAL UI RULES

All cards: border-radius: 16px, white bg, box-shadow: 0 1px 8px rgba(0,0,0,0.06)

Blue CTA buttons: box-shadow: 0 3px 10px #1400FF44

Hero card: box-shadow: 0 8px 32px #1400FF44

Active nav tab: 3px blue gradient bar on top edge of button

Bottom nav: white bg, top border, box-shadow: 0 -4px 20px rgba(0,0,0,0.06), safe area padding bottom

All uppercase labels: font-size: 10-11px, letter-spacing: 2px, Barlow Condensed

Numbers/stats: Barlow Condensed 800 weight

No dark mode

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://evoclub-app.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c2046fda-3b42-4c30-b21b-7b6b5a7987d1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
