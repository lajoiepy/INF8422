---
theme: default
title: Supervised Learning for Robotic Perception
titleTemplate: '%s | INF8422'
info: |
  INF8422: Robotic Perception and Spatial Intelligence
  Prof. Pierre-Yves Lajoie, Polytechnique Montréal
aspectRatio: 16/9
canvasWidth: 980
routerMode: hash
preloadImages: false
layout: cover
htmlAttrs:
  lang: en
hideInToc: true
fonts:
  sans: 'Avenir Next,Nunito Sans'
  mono: 'Fira Code'
  provider: none
  local: ['Avenir Next', 'Nunito Sans', 'Fira Code']
---

# Supervised Learning for Robotic Perception

**INF8422: Robotic Perception and Spatial Intelligence**

Prof. Pierre-Yves Lajoie · Polytechnique Montréal

<img src="./logo.png" class="h-20 mt-5" alt="Polytechnique Montréal" />

<div class="cover-footer-bar"><span style="background:#CF1C24" /><span style="background:#F15A22" /><span style="background:#25B34B" /><span style="background:#00BDF2" /></div>

---
hideInToc: true
---

# Learning a representation useful to the robot

<StepFlow :steps='["Bases de l’apprentissage supervisé", "Représentations par objets", "Cartes pour la conduite autonomeß", "Étiquetage multimodal"]' />

Understand the data, losses and computations that link an observation to an exploitable representation.

<ExampleBlock title="Course objective">

Be able to explain how a model learns, interpret its errors, and integrate its outputs into a geometric perception system useful for robotic planning.

</ExampleBlock>

<!--
Guideline: about three hours, with deeper dives available. Get participation on the demonstrations: predict, manipulate, interpret.
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

