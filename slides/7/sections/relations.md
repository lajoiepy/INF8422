---
layout: section
---

# Relations entre objets

Graphes de scène, hiérarchies spatiales et relations sémantiques.

---
hideInToc: true
---

# Nœuds et relations d’un graphe de scène

<div class="lesson-columns">
<div>

Un graphe de scène 3D contient des nœuds objets et des arêtes de relation.

Un triplet prend la forme :

$$\langle\text{tasse},\text{sur},\text{table}\rangle.$$

</div>
<div>

<ExampleBlock>

« Trouver la tasse sur la table près de la porte » nécessite des identités d’objets, des relations et des positions.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Point de départ : supervision des triplets

<div class="lesson-columns">
<div>

Avec des objets et relations annotés, apprendre :

$$p(r_{ij}\mid h_i,h_j,g_{ij}).$$

</div>
<div>

$h_i,h_j$ décrivent les objets ; $g_{ij}$ décrit distance, orientation et recouvrement relatifs.

Une entropie croisée supervise les relations. Prévoir l’absence de relation lorsque le protocole l’exige.

<AlertBlock>

Les relations sont souvent déséquilibrées : « près de » peut être fréquent, « soutient » rare ou ambigu.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Rappel : passage de messages sur un graphe

<div class="lesson-columns">
<div>

Une couche agrège les informations des voisins :

$$h_i'=\psi\left(h_i,\sum_{j\in\mathcal N(i)}\phi(h_i,h_j,e_{ij})\right).$$

</div>
<div>

Cette structure permet de contextualiser une identité ou une relation.

<ExampleBlock>

Un petit objet au-dessus d’une table dans une cuisine devient plus compatible avec certains usages, sans que le contexte suffise à prouver son identité.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Des nœuds à vocabulaire ouvert

<div class="lesson-columns">
<div>

La carte sémantique fournit géométrie, masques et observations multivue d’instances.

Un modèle vision-langage peut produire une description de chaque objet à partir de ses images.

</div>
<div>

<InfoBlock>

Conserver un identifiant stable distinct du texte : une nouvelle légende ne doit pas créer automatiquement un nouvel objet physique.

</InfoBlock>

Les relations sont associées aux identifiants des instances ; les descriptions textuelles restent des attributs.

</div>
</div>

---
hideInToc: true
---

# Inférer des relations avec du langage

<div class="lesson-columns">
<div>

Un modèle de langage peut proposer des relations à partir de descriptions et d’attributs géométriques fournis.

</div>
<div>

<ExampleBlock>

Entrées : deux objets, leurs boîtes 3D et observations. Sortie proposée : « la tasse est sur la table ».

</ExampleBlock>

<AlertBlock>

La fréquence d’un triplet dans les données textuelles peut favoriser une relation absente de la scène. « Tasse sur table » est plausible même quand la tasse est rangée.

</AlertBlock>

</div>
</div>

---
hideInToc: true
class: figure-slide
---

# Construction d’un graphe avec ConceptGraphs

Les nœuds proviennent d’instances associées entre vues ; les descriptions et relations enrichissent une structure spatiale exploitable par des requêtes.

Distinguer ce qui est mesuré, associé et inféré dans la chaîne de traitement.

<div class="figure-panel">
<img class="figure" src="./images/conceptgraphs-pipeline.png" alt="Gu et al." />
<p class="citation"><a href="https://arxiv.org/abs/2309.16650" target="_blank" rel="noopener">Gu et al. — ConceptGraphs, ICRA 2024. Figure 2.</a></p>
</div>

---
hideInToc: true
---

# Structurer la demande au modèle

Un prompt doit définir les objets admissibles, les relations recherchées et les éléments observés.

```text
Objets : tasse_A, table_B
Données : boîtes 3D, vues associées
Relations admises : sur, dans, près_de
Retourner uniquement les relations soutenues
par ces observations ; une liste vide est valide.
```

<InfoBlock>

Le prompt définit l’espace des sorties admissibles ; chaque relation doit ensuite être confrontée aux observations.

</InfoBlock>

---
hideInToc: true
---

# Validation syntaxique et géométrique des relations

```json
{
  "relations": [
    {"sujet": "tasse_A", "relation": "sur",
     "objet": "table_B", "vues": ["cam_gauche"]}
  ]
}
```

Vérifier syntaxe, identifiants existants et relations admissibles. Puis tester la compatibilité avec la géométrie et les observations citées.

<AlertBlock>

La validité syntaxique du JSON et la validité d’une relation par rapport aux observations sont deux critères distincts.

</AlertBlock>

---
hideInToc: true
---

# Géométrie mesurable et relations sémantiques

| Relation | Information nécessaire |
|---|---|
| À gauche de | Repère et positions |
| Dans | Géométrie des volumes et contenance |
| Sur | Position, contact ou support selon définition |
| Sert à | Usage et contexte sémantique |

<InfoBlock>

Définir le repère de « gauche » et le sens de « sur » avant d’évaluer une relation. Des annotateurs peuvent employer des conventions différentes.

</InfoBlock>

---
hideInToc: true
---

# Hiérarchies spatiales

<div class="lesson-columns">
<div>

Bâtiment, étage, pièce et objet forment plusieurs niveaux d’organisation.

La hiérarchie réduit l’espace de recherche et apporte un contexte pour les requêtes.

</div>
<div>

<ExampleBlock>

« Chercher un extincteur dans le couloir de cet étage » sélectionne d’abord une région, puis les instances candidates.

</ExampleBlock>

Une inclusion hiérarchique n’est pas la même relation qu’une proximité géométrique.

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Hiérarchie d’un graphe de scène

<DemoFrame>
<SceneGraphAnimation />
</DemoFrame>

<p class="demo-caption">Passer des objets aux pièces et observer les relations conservées à chaque niveau.</p>

---
hideInToc: true
---

# Recherche sous contraintes relationnelles

<div class="lesson-columns">
<div>

Décomposer « la tasse sur la table près de la porte » en contraintes d’objets et d’arêtes.

</div>
<div>

Le système retrouve des candidats, teste leurs relations puis retourne leurs positions dans la carte.

<AlertBlock>

Une relation incorrecte utilisée comme contrainte peut éliminer un candidat valide. Conserver les observations associées permet de réexaminer les propositions difficiles.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Graphe de scène et contraintes de planification

<div class="lesson-columns">
<div>

Un graphe peut suggérer des sous-buts : aller dans une pièce, approcher une table, retrouver un objet.

</div>
<div>

La géométrie et le système d’action doivent encore vérifier accès, collisions et état courant.

<ExampleBlock>

« La tasse est dans l’armoire » décrit un emplacement ; l’ouverture de la porte et l’accessibilité par le bras doivent être vérifiées séparément.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Évaluer sans vérité terrain complète

<div class="lesson-columns">
<div>

Une annotation incomplète ne permet pas de traiter toute relation absente comme fausse.

Combiner :

</div>
<div>

- sous-ensembles de relations vérifiés manuellement ;
- accord entre annotateurs et définitions explicites ;
- tests de cohérence géométrique ;
- succès sur des requêtes ou tâches contrôlées.

Rapporter les cas inconnus au lieu de les convertir arbitrairement en négatifs.

</div>
</div>

---
hideInToc: true
---

# Provenance et propagation des erreurs dans un graphe

<div class="lesson-columns">
<div>

Les objets ont une identité, une position, des observations et des relations qui peuvent être inspectées.

</div>
<div>

<InfoBlock>

Cette structure facilite recherche et diagnostic. Elle reste tributaire de la qualité de segmentation, d’association et d’inférence de chaque arête.

</InfoBlock>

Une erreur de nœud peut contaminer plusieurs relations ; analyser uniquement la précision des triplets ne suffit pas.

</div>
</div>
