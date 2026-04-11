

# Iron Lifting Club — Mobile Fitness App

## Overview
A premium mobile fitness app in Brazilian Portuguese for Iron Lifting Club, built as a mobile-first React SPA with max-width 390px, featuring 5 tabs with rich UI components.

## Brand Setup
- Import Google Fonts: Barlow Condensed (700, 800) + DM Sans (400, 500, 600)
- Define CSS variables for brand colors (#1400FF, #F4F5FA, #0A0A1A, #6B7280)
- Card styles: white, 16px radius, subtle shadow, rgba border
- Blue CTA button shadows, hero card glow

## Layout Shell
- App wrapper centered at max-width 390px with #F4F5FA background
- Bottom tab bar with 5 tabs (Início, Grade, Treino, Comunidade, Ranking)
- Active tab: blue top bar + blue icon; inactive: gray
- Safe area padding, white bg, top shadow on nav
- Tab-based routing with state management

## Tab 1 — Início (Dashboard)
- Header: spartan helmet logo + bell icon + avatar initials
- Hero card: blue gradient with total workouts (198), stats row (peso, XP, streak)
- Semana Ativa card: day circles (Seg–Dom) with completion states + progress bar
- XP do Dia card: lightning icon, progress bar (68%), points
- Treino de Hoje card: blue left border, workout details, "Ver treino completo →" link

## Tab 2 — Grade (Class Schedule)
- Sticky header with title
- Horizontal scroll day pills (active = blue)
- Timeline from 05:00–22:00, 18 classes, each 1h "Musculação"
- Cards with trainer name, slots (14 vagas, green dot), "Reservar" button
- Peak hours badge (yellow pill "HORÁRIO NOBRE")
- Current hour highlight with blue border + light blue bg
- Rotating trainers: André, Carla, Julia, Pedro, Fernanda

## Tab 3 — Treino (Workouts)
- Stats row: 3 mini cards (Concluídos, Volume, Streak)
- Mon–Fri workout list with states (done/today/upcoming)
- Today card highlighted with blue tint + "HOJE" pill
- Drill-down view for today's workout: back button, progress bar, 8 exercises
- Exercise rows: name, sets, load, rest; done items with checkmark + strikethrough

## Tab 4 — Comunidade (Community)
- Online members card with stacked avatars + count
- Feed section with posts: avatar, name, timestamp, message
- Like (❤️) and comment buttons per post

## Tab 5 — Ranking
- Pill tab switcher: Semana/Mês/Ano
- "Minha posição" blue gradient card with user stats
- Visual podium: 3 columns (#1 center tallest with crown, #2 left silver, #3 right bronze)
- Full ranking list below: position, avatar, name, XP, streak, progress bar
- "Me" card highlighted with blue bg + border + "VOCÊ" pill

## Data
All data is hardcoded/mock — no backend needed. Realistic Brazilian names and values throughout.

