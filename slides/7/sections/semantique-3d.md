---
layout: section
---

# Du 2D au 3D sémantique

Fusion de caractéristiques visuelles et linguistiques dans une carte 3D.

---
hideInToc: true
---

# Caractéristiques visuelles dans une carte 3D

<div class="lesson-columns">
<div>

Une carte géométrique stocke positions, surfaces ou occupation. On peut lui ajouter un vecteur visuel par point, voxel, objet ou primitive.

$$\mathcal M=\{(X_j,f_j)\}.$$

</div>
<div>

<ExampleBlock>

Le robot cherche « l’extincteur » en comparant cette requête aux vecteurs attachés à sa carte.

</ExampleBlock>

Le choix de l’unité de stockage fixe un compromis entre détail, mémoire et capacité de recherche.

</div>
</div>

---
hideInToc: true
---

# Rappel : espaces de représentation de CLIP et DINO

<div class="lesson-columns">
<div>

CLIP aligne ses encodeurs d’image et de texte par un objectif contrastif.

DINO fournit des caractéristiques visuelles apprises par auto-distillation.

</div>
<div>

<InfoBlock>

Un vecteur DINO peut aider à associer des surfaces entre vues. Une comparaison directe avec du texte exige un espace explicitement aligné avec le langage.

</InfoBlock>

Une carte peut conserver plusieurs types de caractéristiques pour des rôles différents.

</div>
</div>

---
hideInToc: true
---

# Projeter les caractéristiques dans le monde

<div class="lesson-columns">
<div>

Avec la profondeur $D(u)$ et la pose caméra :

$$X_w=R_{w\leftarrow c}\big(D(u)K^{-1}\tilde u\big)+t_{w\leftarrow c}.$$

</div>
<div>

Attacher au point la caractéristique $f(u)$ issue du modèle visuel.

<AlertBlock>

Profondeur, image et carte de caractéristiques doivent être alignées. Un patch couvre une région ; sa caractéristique peut mélanger deux objets à une frontière.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Fusionner plusieurs observations

<div class="lesson-columns">
<div>

Pour une cellule vue plusieurs fois, une moyenne pondérée donne :

$$f_{\mathrm{new}}=\frac{w_{\mathrm{old}}f_{\mathrm{old}}+w_{\mathrm{obs}}f_{\mathrm{obs}}}{w_{\mathrm{old}}+w_{\mathrm{obs}}}.$$

</div>
<div>

Les poids peuvent dépendre de la visibilité, de la qualité géométrique ou de l’angle de vue. Renormaliser si la recherche utilise le cosinus.

<InfoBlock>

Une fusion cohérente nécessite que les observations concernent la même surface et le même espace de caractéristiques.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Éviter de fusionner à travers une occlusion

<div class="lesson-columns">
<div>

Avant d’intégrer une caractéristique, comparer sa profondeur à la surface de carte visible depuis cette caméra.

Une différence importante peut signaler une autre surface, un objet mobile ou une erreur de pose.

</div>
<div>

<ExampleBlock>

Le vecteur d’une personne passant devant une armoire ne doit pas remplacer définitivement celui de l’armoire.

</ExampleBlock>

Une moyenne répétée ne corrige pas une association systématiquement erronée.

</div>
</div>

---
hideInToc: true
---

# Interroger par similarité cosinus

<div class="lesson-columns">
<div>

Pour le texte encodé $z^T$ et une caractéristique cartographique $f_j$ dans le même espace :

$$s_j=\frac{(z^T)^\top f_j}{\|z^T\|_2\|f_j\|_2}.$$

</div>
<div>

Classer les éléments par ce score fournit des candidats.

<AlertBlock>

La similarité cosinus compare des représentations dans un espace appris. Un seuil de sélection permet de rejeter les candidats faiblement compatibles avec la requête.

</AlertBlock>

</div>
</div>

---
hideInToc: true
class: figure-slide
---

# ConceptFusion : plusieurs modalités pour une carte

Une carte enrichie de caractéristiques permet des requêtes textuelles ou visuelles, tout en conservant une localisation 3D des résultats.

Observer comment une requête sélectionne une région du monde plutôt qu’une simple image de la base.

<div class="figure-panel">
<img class="figure" src="./images/conceptfusion-requetes.png" alt="Jatavallabhula et al." />
<p class="citation"><a href="https://arxiv.org/abs/2302.07241" target="_blank" rel="noopener">Jatavallabhula et al. — ConceptFusion, RSS 2023. Figure 1.</a></p>
</div>

---
hideInToc: true
class: demo-slide
---

# Recherche d’objets par similarité dans la carte

<DemoFrame>
<OpenVocabMapAnimation />
</DemoFrame>

<p class="demo-caption">Comparer les scores visuels et la position 3D des candidats. Les scores de cette démonstration sont illustratifs.</p>

---
hideInToc: true
---

# Des masques 2D vers des instances 3D

1. Obtenir des masques avec un modèle de segmentation conditionné par prompt.
2. Reprojeter les pixels valides avec profondeur et pose.
3. Associer les régions à des instances déjà présentes.
4. Fusionner géométrie, caractéristiques et observations.

<InfoBlock>

Une même instance peut être fragmentée dans une vue et regroupée dans une autre. La fusion doit gérer ces divergences.

</InfoBlock>

---
hideInToc: true
---

# Associer les instances entre vues

<div class="lesson-columns">
<div>

Un coût d’association peut combiner recouvrement 3D, proximité et similarité de caractéristiques.

$$C_{ij}=\lambda_gd_{\mathrm{geom}}(i,j)+\lambda_f(1-s(f_i,f_j)).$$

</div>
<div>

L’appariement un-à-un est utile lorsque cette hypothèse convient ; des règles de fusion et division sont nécessaires sinon.

<AlertBlock>

Deux chaises proches et identiques peuvent avoir une forte similarité sans être le même objet.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Vocabulaire ouvert et granularité des objets

<div class="lesson-columns">
<div>

Les objets peuvent être décrits par plusieurs formulations : « siège », « chaise », « chaise rouge ».

Une description peut désigner une partie, un groupe ou un attribut temporaire.

</div>
<div>

<ExampleBlock>

Un masque de poignée et un masque de porte peuvent tous deux être valides, tout en décrivant deux niveaux différents.

</ExampleBlock>

Définir l’unité d’objet recherchée et conserver la provenance des observations évite de traiter chaque texte comme une identité physique.

</div>
</div>

---
hideInToc: true
---

# Du nuage de vecteurs à un champ continu

<div class="lesson-columns">
<div>

Au lieu de stocker un vecteur sur une grille fixe, apprendre un champ de caractéristiques :

$$f_\theta:\mathbb R^3\rightarrow\mathbb R^d.$$

</div>
<div>

Les observations de plusieurs vues supervisent des projections de ce champ.

<InfoBlock>

La continuité permet des requêtes entre points échantillonnés, mais les régions jamais observées restent régies par les hypothèses du modèle.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# NeRF : représenter densité et couleur

<div class="lesson-columns">
<div>

Un champ neuronal reçoit une position $X$ et une direction de vue unitaire $r$ :

$$F_\theta(X,r)=(\sigma(X),c(X,r)).$$

</div>
<div>

$\sigma$ est une densité volumique ; $c$ est une couleur pouvant dépendre du point de vue.

La couleur d’un pixel résulte de l’intégration le long de son rayon.

<ExampleBlock>

Un reflet peut changer avec la direction d’observation, alors que la surface géométrique reste au même endroit.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Rappel : visibilité le long d’un rayon

<div class="lesson-columns">
<div>

Pour des échantillons espacés de $\delta_i$ :

$$\alpha_i=1-e^{-\sigma_i\delta_i},\quad T_i=\prod_{j<i}(1-\alpha_j),\quad \hat C=\sum_i T_i\alpha_i c_i.$$

</div>
<div>

Les surfaces proches atténuent les contributions lointaines. Une composante d’arrière-plan reçoit la transmittance résiduelle.

<InfoBlock>

La couleur rendue est différentiable par rapport à la densité et aux couleurs, ce qui permet l’optimisation depuis les images.

</InfoBlock>

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Composer un pixel depuis un volume

<DemoFrame>
<VolumeRenderingRayAnimation />
</DemoFrame>

<p class="demo-caption">Observer les contributions successives et la transmittance restante.</p>

---
hideInToc: true
class: figure-slide
---

# NeRF apprend par comparaison d’images

Des images avec poses connues fournissent une erreur entre couleurs rendues et observées.

Le champ est optimisé pour reproduire plusieurs vues, ce qui contraint sa structure partagée.

<div class="figure-panel">
<img class="figure" src="./images/nerf-pipeline.png" alt="Mildenhall et al." />
<p class="citation"><a href="https://arxiv.org/abs/2003.08934" target="_blank" rel="noopener">Mildenhall et al. — NeRF, ECCV 2020. Figure 1.</a></p>
</div>

---
hideInToc: true
---

# Gaussian splatting : des primitives explicites

<div class="lesson-columns">
<div>

Une gaussienne 3D possède un centre $\mu$, une covariance $\Sigma$, une opacité et une apparence.

$$G(X)=\exp\!\left[-\tfrac12(X-\mu)^\top\Sigma^{-1}(X-\mu)\right].$$

</div>
<div>

La projection produit une empreinte elliptique dans l’image. Les primitives sont compositées selon profondeur et opacité.

<InfoBlock>

La représentation est explicite et peut être rendue efficacement ; le nombre de primitives et la gestion de visibilité contrôlent son coût.

</InfoBlock>

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Observer des primitives gaussiennes

<DemoFrame>
<GaussianSplattingScene />
</DemoFrame>

<p class="demo-caption">Faire tourner la scène pour distinguer positions 3D et empreintes projetées.</p>

---
hideInToc: true
---

# Optimiser une représentation en splats

<div class="lesson-columns">
<div>

Une perte de rendu ajuste positions, tailles, orientations, opacités et couleurs.

</div>
<div>

L’ajout ou suppression de primitives permet d’allouer plus de détail aux régions difficiles.

<AlertBlock>

Des primitives peuvent reproduire des images tout en représentant imparfaitement une surface physique. Une qualité photométrique élevée n’équivaut pas à une carte de collision validée.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Distiller des caractéristiques dans le rendu

<div class="lesson-columns">
<div>

Associer une caractéristique $f_i$ aux échantillons ou splats, puis la rendre avec leurs poids de visibilité :

$$\hat F(u)=\sum_i w_i(u)f_i.$$

</div>
<div>

Comparer la sortie à des caractéristiques 2D d’un enseignant gelé, par distance ou similarité.

<ExampleBlock>

Plusieurs vues d’un même objet entraînent une représentation sémantique 3D commune, sans lui attribuer une classe fixe.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Résolution et mélange des caractéristiques distillées

<div class="lesson-columns">
<div>

Les enseignants 2D peuvent avoir une faible résolution ou changer de représentation selon le contexte.

</div>
<div>

Mélanger plusieurs surfaces sur un rayon ou plusieurs objets dans un masque brouille les caractéristiques.

<InfoBlock>

Comparer recherche sur points, sur instances et sur champ rendu permet de mesurer l’effet de la représentation 3D sur les résultats de recherche.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Évaluer une carte interrogeable

<div class="lesson-columns">
<div>

Mesurer localisation des objets, qualité de segmentation, récupération par requête et cohérence entre vues.

</div>
<div>

Inclure synonymes, objets absents, descriptions ambiguës et scènes modifiées.

<AlertBlock>

Le jeu de requêtes et les références doivent être fixés indépendamment des résultats du système pour estimer le rappel.

</AlertBlock>

</div>
</div>
