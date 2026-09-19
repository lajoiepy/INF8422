---
layout: section
---

# Manipulation et perception interactive

Préhension et estimation des propriétés d’objets à partir des interactions.

---
hideInToc: true
---

# Prédire une préhension depuis une observation

<div class="lesson-columns">
<div>

Une approche supervisée associe image ou nuage à des préhensions de qualité connue.

</div>
<div>

- En vue de dessus : position, angle dans le plan et ouverture de pince.
- En 3D : pose de préhension 6-DoF, ouverture et score.

<ExampleBlock>

La préhension nécessite un contact accessible et compatible avec la géométrie de la pince.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Rappel : une carte dense prédit localement

<div class="lesson-columns">
<div>

Comme une segmentation produit une classe par pixel, une carte de préhension produit des attributs par position :

$$Q(u,v),\quad \Theta(u,v),\quad W(u,v).$$

</div>
<div>

$Q$ représente une qualité estimée ; $\Theta$ l’angle de la pince ; $W$ son ouverture.

<InfoBlock>

Chaque position est une action candidate. Le maximum de qualité doit encore être compatible avec les contraintes géométriques du robot.

</InfoBlock>

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Une carte d’actions candidates

<DemoFrame>
<SpatialActionMapAnimation />
</DemoFrame>

<p class="demo-caption">Observer comment la sélection d’une action dépend de sa position et de son orientation.</p>

---
hideInToc: true
---

# Préhensions 6-DoF sur un nuage

<div class="lesson-columns">
<div>

Un réseau peut produire des contacts, une direction d’approche et une orientation de pince sur des points candidats.

La pose transforme la pince vers le repère de la scène :

$$T_{\mathrm{scène}\leftarrow\mathrm{pince}}\in SE(3).$$

</div>
<div>

<AlertBlock>

Une préhension géométriquement plausible peut être inatteignable par le bras ou entrer en collision pendant l’approche. L’accessibilité cinématique et les collisions doivent être vérifiées par le planificateur.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Produire des étiquettes analytiques en simulation

<div class="lesson-columns">
<div>

Des maillages connus permettent d’échantillonner des préhensions et d’évaluer contacts, collisions et résistance à des perturbations.

Les observations simulées sont associées à ces scores calculés.

</div>
<div>

<ExampleBlock>

Un simulateur génère une profondeur depuis un point de vue aléatoire et la qualité de plusieurs positions de pince.

</ExampleBlock>

Le signal est supervisé par un modèle physique ; il dépend de ses hypothèses sur friction, rigidité et capteur.

</div>
</div>

---
hideInToc: true
---

# Parenthèse : randomiser le domaine simulé

<div class="lesson-columns">
<div>

Varier éclairage, textures, bruit de profondeur, poses et paramètres physiques évite une dépendance trop forte à un simulateur particulier.

</div>
<div>

<InfoBlock>

Le réseau apprend à ignorer certaines variations et à conserver les indices qui restent utiles pour la préhension.

</InfoBlock>

Une variation arbitraire peut aussi détruire les indices pertinents. Le transfert doit être mesuré sur des objets et des conditions réels indépendants.

</div>
</div>

---
hideInToc: true
---

# Auto-étiquetage des essais de préhension

<div class="lesson-columns">
<div>

Après fermeture et soulèvement, le robot enregistre succès ou échec à partir de ses capteurs.

$$\mathcal D\gets\mathcal D\cup\{(o_t,a_t,y_t)\},\qquad y_t\in\{0,1\}.$$

</div>
<div>

L’observation $o_t$ et l’action $a_t$ deviennent l’entrée d’un prédicteur de succès.

<ExampleBlock>

Présence dans la pince, déplacement de l’objet et maintien après soulèvement peuvent contribuer au critère de succès.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Définition et mesure du succès

| Critère | Ambiguïté possible |
|---|---|
| Pince non fermée complètement | Contact avec la table |
| Objet soulevé | Chute immédiate après le test |
| Objet transporté | Objet différent de celui attendu |

<AlertBlock>

Les erreurs des capteurs ou du critère de succès peuvent produire des étiquettes incorrectes.

</AlertBlock>

Définir la fenêtre temporelle et les signaux qui confirment l’événement demandé.

---
hideInToc: true
---

# Apprendre la réussite d’une action

<div class="lesson-columns">
<div>

Pour une observation $o$, une action $a$ et une étiquette $y$ :

$$p_\theta=\sigma(f_\theta(o,a)),\qquad \ell=-y\log p_\theta-(1-y)\log(1-p_\theta).$$

</div>
<div>

Le système peut évaluer plusieurs préhensions admissibles avant d’en essayer une.

<InfoBlock>

Le modèle estime la réussite immédiate d’une préhension conditionnellement à l’observation et à l’action.

</InfoBlock>

</div>
</div>

---
hideInToc: true
class: figure-slide
---

# Apprendre de nombreuses tentatives

Les expériences de préhension à grande échelle illustrent la boucle observation–action–résultat.

Chaque exemple associe une observation, une commande et un résultat mesuré.

<div class="figure-panel">
<img class="figure" src="./images/prehension-auto-etiquetee.png" alt="Levine et al." />
<p class="citation"><a href="https://arxiv.org/abs/1603.02199" target="_blank" rel="noopener">Levine et al. — Learning Hand-Eye Coordination, arXiv 2016. Collecte robotique.</a></p>
</div>

---
hideInToc: true
---

# Biais de collecte induit par la sélection des actions

<div class="lesson-columns">
<div>

Si l’on essaie toujours l’action jugée meilleure, la base évolue avec le modèle.

Des régions jugées mauvaises peuvent ne jamais être testées. Les exemples ne sont donc pas un échantillon fixe et indépendant de l’apprentissage.

</div>
<div>

<ExampleBlock>

Une pince choisit seulement les objets très saillants ; elle collecte peu d’informations sur les objets plats.

</ExampleBlock>

Conserver les scores, actions candidates et critères de sélection aide à comprendre ce biais.

</div>
</div>

---
hideInToc: true
---

# Exploration et exploitation

<div class="lesson-columns">
<div>

**Exploiter** : sélectionner une action déjà estimée favorable.

**Explorer** : essayer d’autres actions admissibles pour obtenir une expérience plus diverse.

</div>
<div>

Un mélange peut inclure des essais aléatoires dans un ensemble géométriquement valide.

<AlertBlock>

Le protocole de collecte modifie la distribution des cibles. Un ensemble d’essais commun permet de comparer les modèles à difficulté de préhension fixée.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Succès et échecs peuvent être déséquilibrés

<div class="lesson-columns">
<div>

Au démarrage, les succès peuvent être rares ; après adaptation, les échecs observés peuvent devenir rares.

</div>
<div>

- Équilibrer ou pondérer les mini-lots.
- Garder des exemples difficiles et représentatifs.
- Rapporter la réussite par famille d’objets et conditions.

<InfoBlock>

Rééquilibrer les données modifie l’apprentissage : les scores doivent encore être validés sur la distribution réelle des essais.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Rappel : stabiliser l’apprentissage en ligne

<div class="lesson-columns">
<div>

Un petit tampon de rejeu mélange expériences anciennes et récentes. Une mise à jour trop concentrée sur un nouvel objet peut faire oublier les autres.

$$L=\alpha L_{\mathrm{récent}}+(1-\alpha)L_{\mathrm{rejeu}}.$$

</div>
<div>

<ExampleBlock>

Après une série de cubes rigides, vérifier que le modèle traite encore les objets courbes et les surfaces réfléchissantes.

</ExampleBlock>

Conserver une évaluation fixe permet de distinguer progrès réel et changement du niveau de difficulté des essais.

</div>
</div>

---
hideInToc: true
---

# Segmentation d’objets par poussée

<div class="lesson-columns">
<div>

Avant l’action, deux objets adjacents peuvent partager une couleur et une silhouette commune.

Une poussée fait bouger l’un d’eux. Les points qui suivent le même déplacement deviennent des candidats à une même instance.

</div>
<div>

<InfoBlock>

L’action connue permet de relier le déplacement observé au contact commandé. Un même déplacement peut toutefois concerner plusieurs objets.

</InfoBlock>

Un contact peut déplacer plusieurs objets ou déformer un objet souple.

</div>
</div>

---
hideInToc: true
---

# Correspondances entre avant et après

<div class="lesson-columns">
<div>

Le flux optique associe à chaque pixel un déplacement image :

$$u'=u+f(u),\qquad f(u)=(\Delta u,\Delta v).$$

</div>
<div>

Un réseau compare les caractéristiques des deux observations pour estimer cette correspondance.

<ExampleBlock>

Après une poussée, une zone cohérente de déplacements décrit la surface déplacée. La caméra ou le bras peuvent également bouger : leurs effets doivent être séparés.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Apprendre à comparer des caractéristiques

<div class="lesson-columns">
<div>

Deux encodeurs partagés produisent $F_a(u)$ et $F_b(v)$. Une similarité évalue si les régions correspondent.

Un module appris transforme ces comparaisons, le contexte et une estimation courante en une correction de déplacement.

</div>
<div>

<AlertBlock>

Texture répétitive, disparition d’un point et contact entre objets rendent la meilleure ressemblance locale ambiguë.

</AlertBlock>

La cohérence spatiale et géométrique apporte une contrainte supplémentaire.

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Observer des correspondances denses

<DemoFrame>
<OpticalFlowRAFTAnimation />
</DemoFrame>

<p class="demo-caption">Une correspondance déplace l’information d’une observation vers l’autre ; les régions occultées restent problématiques.</p>

---
hideInToc: true
---

# Une supervision par cohérence après l’action

<div class="lesson-columns">
<div>

Avec le flux estimé, reconstruire l’observation initiale depuis l’observation après action :

$$\hat I_a(u)=I_b(u+f(u)).$$

</div>
<div>

Utiliser une perte d’apparence ou de caractéristiques sur les pixels valides.

<InfoBlock>

Rappel : l’interpolation bilinéaire rend l’échantillonnage différentiable. Les pixels sans correspondant visible ne doivent pas imposer une reconstruction impossible.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Du déplacement au masque d’objet

<div class="lesson-columns">
<div>

1. Compenser le mouvement connu de la caméra.
2. Détecter les déplacements résiduels cohérents.
3. Regrouper les points ou pixels compatibles.
4. Projeter ces regroupements vers les observations initiales.

</div>
<div>

<ExampleBlock>

Un objet poussé peut ainsi fournir son propre masque d’entraînement, même si sa catégorie n’était pas connue.

</ExampleBlock>

Une surface immobile peut appartenir au même objet mais être cachée ou mal observée.

</div>
</div>

---
hideInToc: true
---

# Articulations prismatiques et révolutes

<div class="lesson-columns">
<div>

Les correspondances 3D entre plusieurs états permettent de tester des modèles articulés.

- **Prismatique** : translation le long d’un axe.
- **Révolute** : rotation autour d’un axe et d’un pivot.

</div>
<div>

<ExampleBlock>

Une poignée de porte décrit un arc ; celle d’un tiroir suit approximativement une ligne.

</ExampleBlock>

L’amplitude observée doit être suffisante pour distinguer les deux modèles.

</div>
</div>

---
hideInToc: true
---

# Estimer un axe d’articulation

<div class="lesson-columns">
<div>

Modèle prismatique : $X_t=X_0+s_ta$, où $\|a\|=1$.

Modèle révolute :

$$X_t=R(a,\theta_t)(X_0-c)+c.$$

</div>
<div>

Ajuster axe $a$, pivot $c$ et états aux trajectoires observées, puis comparer les résidus.

<AlertBlock>

Un petit arc ressemble à une droite. Les points peu mobiles, les occultations et la déformation limitent l’identifiabilité du mécanisme.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Soulever pour tester une relation de support

<div class="lesson-columns">
<div>

Si un objet est retiré, observer ce qui se déplace, reste stable ou chute renseigne sur les contacts et les dépendances.

</div>
<div>

<ExampleBlock>

Une tasse posée sur un plateau peut se déplacer avec lui ; un objet situé derrière le plateau dans l’image ne le suit pas nécessairement.

</ExampleBlock>

La relation « supporte » est une hypothèse physique testée par l’interaction. Des frottements ou prises simultanées peuvent compliquer son interprétation.

</div>
</div>

---
hideInToc: true
---

# Aperçu : la perception tactile

<div class="lesson-columns">
<div>

Les capteurs tactiles mesurent contact, déformation ou cisaillement ; certains utilisent une caméra interne pour imager une membrane.

Une représentation tactile peut prédire présence de contact, glissement ou propriétés locales de surface.

</div>
<div>

<InfoBlock>

La vision fournit un contexte à distance ; le toucher renseigne une région effectivement en contact.

</InfoBlock>

Synchroniser action, vision et toucher permet de créer des paires multimodales sans annoter chaque contact.

</div>
</div>

---
hideInToc: true
---

# Évaluation de la perception interactive

<div class="lesson-columns">
<div>

Séparer plusieurs sorties :

</div>
<div>

- taux de réussite sur de nouveaux objets ;
- qualité des masques obtenus par mouvement ;
- erreur d’axe et de modèle d’articulation ;
- quantité d’expériences nécessaires.

<AlertBlock>

Une meilleure stratégie de sélection peut augmenter la réussite sans améliorer la perception. Une évaluation contrôlée doit distinguer ces effets.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Action commandée et mouvement observé

<div class="lesson-columns">
<div>

Le robot connaît sa commande et observe ses conséquences.

</div>
<div>

Ce lien permet de produire des étiquettes de réussite, des masques, des correspondances et des relations mécaniques.

<ExampleBlock>

Les déplacements consécutifs à une poussée peuvent inclure le mouvement de la caméra, des contacts indirects et des mouvements d’agents extérieurs.

</ExampleBlock>

</div>
</div>
