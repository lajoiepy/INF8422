---
theme: default
title: Apprentissage supervisé pour la perception robotique
titleTemplate: '%s | INF8422'
info: |
  INF8422 : Perception Robotique et Intelligence Spatiale
  Prof. Pierre-Yves Lajoie, Polytechnique Montréal
aspectRatio: 16/9
canvasWidth: 980
routerMode: hash
preloadImages: false
layout: cover
htmlAttrs:
  lang: fr
hideInToc: true
fonts:
  sans: 'Avenir Next,Nunito Sans'
  mono: 'Fira Code'
  provider: none
  local: ['Avenir Next', 'Nunito Sans', 'Fira Code']
---

# Apprentissage supervisé pour la perception robotique

**INF8422 : Perception Robotique et Intelligence Spatiale**

Prof. Pierre-Yves Lajoie · Polytechnique Montréal

<img src="./logo.png" class="h-20 mt-5" alt="Polytechnique Montréal" />

<div class="cover-footer-bar"><span style="background:#CF1C24" /><span style="background:#F15A22" /><span style="background:#25B34B" /><span style="background:#00BDF2" /></div>

---
hideInToc: true
---

# Apprendre une représentation utile au robot

<StepFlow :steps='["Bases de l’apprentissage supervisé", "Représentations par objets", "Cartes pour la conduite autonomeß", "Étiquetage multimodal"]' />

Comprendre les données, les pertes et les calculs qui relient une observation à une représentation exploitable.

<ExampleBlock title="Objectif du cours">

Pouvoir expliquer comment un modèle apprend, interpréter ses erreurs et intégrer ses sorties dans un système de perception géométrique utile pour la planification robotique.

</ExampleBlock>

<!--
Repère : environ trois heures, avec approfondissements disponibles. Faire participer sur les démonstrations : prédire, manipuler, interpréter.
-->

---
hideInToc: true
---

# Plan

<Toc maxDepth="1" listStyle="disc" />

---
src: ./sections/bases.md
---

---
src: ./sections/representations-objet.md
---

---
src: ./sections/cartes-hd.md
---

---
src: ./sections/reconnaissance-lieux.md
---

---
src: ./sections/synthese.md
---

