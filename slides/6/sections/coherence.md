---
layout: section
---

# Signaux de cohérence

Reprojection, apprentissage contrastif, auto-distillation et reconstruction masquée.

---
hideInToc: true
---

# Construction de cibles auto-supervisées

<div class="lesson-columns">
<div>

L’auto-supervision construit les cibles d’apprentissage à partir des observations disponibles.

- Prédire une vue à partir d’une autre.
- Retrouver une observation transformée parmi des candidates.
- Reconstruire des parties masquées.

</div>
<div>

<InfoBlock>

La définition des cibles dépend des transformations appliquées aux données et des hypothèses de la tâche prétexte.

</InfoBlock>

L’utilité du pré-entraînement se mesure sur les tâches robotiques visées.

</div>
</div>

---
hideInToc: true
---

# Supervision par synthèse de vue

<div class="lesson-columns">
<div>

Une caméra qui se déplace voit une même surface à des positions différentes.

Si l’on connaît la profondeur et le mouvement, on peut reconstruire l’apparence d’une vue à partir de l’autre.

</div>
<div>

<ExampleBlock>

Apprendre une profondeur qui permet de replacer correctement les pixels d’une façade fournit un signal sans carte de profondeur annotée.

</ExampleBlock>

Le raisonnement suppose une surface visible, une apparence suffisamment stable et un modèle de mouvement approprié.

</div>
</div>

---
hideInToc: true
---

# Profondeur et ego-mouvement appris

<div class="lesson-columns">
<div>

Deux réseaux peuvent prédire :

$$D_t=f_\theta(I_t),\qquad T_{s\leftarrow t}=g_\varphi(I_t,I_s).$$

</div>
<div>

$D_t$ donne la profondeur dans la caméra cible ; $T_{s\leftarrow t}$ transforme ses points vers la caméra source.

Une synthèse de vue relie ces sorties à une image observable. La perte se rétropropage jusqu’aux deux réseaux.

<AlertBlock>

Des erreurs de profondeur et de translation peuvent se compenser dans la projection. Les deux estimations doivent être évaluées conjointement.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Reprojeter un pixel

<div class="lesson-columns">
<div>

Pour le pixel cible homogène $\tilde u$ :

$$X_t=D_t(u)K_t^{-1}\tilde u,$$
$$X_s=R_{s\leftarrow t}X_t+t_{s\leftarrow t},\qquad u_s=\pi(K_sX_s).$$

</div>
<div>

La fonction $\pi$ divise par la profondeur homogène. On lit ensuite l’image source en $u_s$ pour reconstruire le pixel cible.

<InfoBlock>

Le sens de la transformation compte : une reconstruction cible utilise ici un échantillonnage inverse depuis la source.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Interpoler à une position non entière

<div class="lesson-columns">
<div>

La projection tombe rarement au centre d’un pixel. Pour $u_s=(i+\alpha,j+\beta)$, avec $0\leq\alpha,\beta\leq1$ :

$$\hat I=(1-\alpha)(1-\beta)I_{i,j}+\alpha(1-\beta)I_{i+1,j}$$
$$\hspace{1em}+(1-\alpha)\beta I_{i,j+1}+\alpha\beta I_{i+1,j+1}.$$

</div>
<div>

L’interpolation bilinéaire varie continûment avec les coordonnées, par morceaux. Un gradient peut donc modifier profondeur et pose.

<AlertBlock>

Arrondir la position au pixel détruit presque partout cette dépendance différentiable.

</AlertBlock>

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Échantillonnage bilinéaire différentiable

<DemoFrame>
<PhotometricWarpAnimation />
</DemoFrame>

<p class="demo-caption">Modifier la profondeur et la translation : les quatre poids bilinéaires et l’intensité reconstruite changent.</p>

---
hideInToc: true
---

# Comparer les images : L1 et SSIM

<div class="lesson-columns">
<div>

Une erreur photométrique courante combine intensité et structure locale :

$$e(u)=\alpha\frac{1-SSIM(I_t,\hat I_t)}2+(1-\alpha)|I_t(u)-\hat I_t(u)|.$$

</div>
<div>

SSIM compare moyennes, variances et corrélation de fenêtres locales. La L1 reste sensible à la différence directe des intensités.

<ExampleBlock>

Deux patchs de luminances différentes peuvent conserver une structure similaire. Les variations d’éclairage importantes restent une source d’erreur.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Similarité structurelle locale : SSIM

<div class="lesson-columns">
<div>

Pour deux petites fenêtres $x,y$ :

$$SSIM(x,y)=\frac{(2\mu_x\mu_y+C_1)(2\sigma_{xy}+C_2)}{(\mu_x^2+\mu_y^2+C_1)(\sigma_x^2+\sigma_y^2+C_2)}.$$

</div>
<div>

Les constantes évitent les divisions instables. Les moyennes comparent la luminance ; variances et covariance comparent contraste et structure.

<InfoBlock>

SSIM mesure une similarité locale d’apparence. Des géométries différentes peuvent obtenir des scores proches dans des régions peu texturées.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Occultations et reprojection minimale

<div class="lesson-columns">
<div>

Un pixel cible peut ne pas être visible dans la source : un véhicule révèle une portion de mur en se déplaçant.

Avec plusieurs sources, une perte de **reprojection minimale** choisit l’erreur la plus faible :

$$e_{min}(u)=\min_s e(I_t(u),\hat I_{t\leftarrow s}(u)).$$

</div>
<div>

Les points hors image ou derrière la caméra doivent être exclus.

<AlertBlock>

Le minimum aide lorsque l’une des sources voit la surface ; il ne résout pas toutes les occultations.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Masquage automatique par erreur de reprojection

<div class="lesson-columns">
<div>

Comparer la reconstruction après déplacement à une copie sans déplacement :

$$m(u)=\mathbf1\!\left[\min_s e(I_t,\hat I_{t\leftarrow s})(u)<\min_s e(I_t,I_s)(u)\right].$$

</div>
<div>

Un pixel est retenu si la géométrie améliore la correspondance.

<AlertBlock>

Ce masque retient les pixels dont l’erreur diminue après reprojection. Les surfaces statiques peuvent être retenues lorsque la caméra se déplace.

</AlertBlock>

</div>
</div>

<!--
Distinguer masquage automatique et gestion des occultations par minimum de reprojection. Une caméra arrêtée peut conduire à masquer une grande partie de l’image.
-->



---
hideInToc: true
---

# Régulariser la profondeur dans les zones uniformes

<div class="lesson-columns">
<div>

Un mur sans texture fournit peu d’indications pour l’appariement photométrique.

Une pénalité de lissage peut préserver les bords de l’image :

$$L_s=|\partial_x d^*|e^{-|\partial_x I|}+|\partial_y d^*|e^{-|\partial_y I|}.$$

</div>
<div>

$d^*$ peut être une profondeur inverse normalisée. Une forte variation d’image réduit le lissage à cet endroit.

<AlertBlock>

Un bord de couleur n’est pas toujours un bord de profondeur, et une discontinuité 3D peut être peu visible.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Ambiguïté d’échelle monoculaire

<div class="lesson-columns">
<div>

Multiplier les profondeurs et les translations par le même $s>0$ ne change pas la projection :

$$\pi\!\left(K(sRX+st)\right)=\pi\!\left(K(RX+t)\right).$$

</div>
<div>

La vidéo monoculaire peut donc apprendre une géométrie à un facteur d’échelle près.

<ExampleBlock>

Un monde deux fois plus grand traversé deux fois plus vite peut produire les mêmes déplacements d’image.

</ExampleBlock>

Une information métrique indépendante est nécessaire pour lever cette ambiguïté géométrique.

</div>
</div>

---
hideInToc: true
---

# Stéréo et échelle métrique

<div class="lesson-columns">
<div>

Pour une paire rectifiée de focale $f$, base stéréo $b$ et disparité $\delta$ :

$$Z=\frac{fb}{\delta}.$$

</div>
<div>

Le réseau prédit une disparité ou une profondeur, puis reconstruit l’autre image. La base stéréo connue fixe l’échelle métrique.

<AlertBlock>

Les régions sans texture, les reflets et les occultations restent difficiles. La perte doit exclure les correspondances invalides.

</AlertBlock>

</div>
</div>

---
hideInToc: true
class: figure-slide
---

# Profondeur auto-supervisée avec Monodepth2

Monodepth2 combine reconstruction photométrique, reprojection minimale et masquage automatique.

Les résultats qualitatifs montrent les contours et les structures fines ; l’évaluation quantitative mesure les erreurs de profondeur.

<div class="figure-panel">
<img class="figure" src="./images/monodepth2-resultats.png" alt="Godard et al." />
<p class="citation"><a href="https://arxiv.org/abs/1806.01260" target="_blank" rel="noopener">Godard et al. — Monodepth2, ICCV 2019. Résultats de profondeur.</a></p>
</div>

---
hideInToc: true
---

# Évaluer une profondeur apprise sans étiquettes

<div class="lesson-columns">
<div>

L’entraînement peut être auto-supervisé ; l’évaluation doit utiliser une référence indépendante lorsqu’elle est disponible.

</div>
<div>

Préciser : plages de profondeur, pixels valides, résolution et alignement d’échelle autorisé.

<AlertBlock>

Réaligner chaque image sur la profondeur de référence mesure une qualité relative. Cela ne démontre pas une profondeur métrique exploitable directement par le robot.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Rappel : perte triplet et représentations vectorielles

<div class="lesson-columns">
<div>

Un encodeur produit un descripteur $z$. La perte triplet impose une marge $m$ entre les distances ancre–positif et ancre–négatif.

$$\ell_{\mathrm{tri}}=\max(0,d(z_a,z_p)-d(z_a,z_n)+m).$$

</div>
<div>

L’apprentissage contrastif peut produire les positifs à partir de deux transformations d’une même observation.

<ExampleBlock>

Deux recadrages montrant le même véhicule partagent une partie de leur contenu, sans annotation de sa catégorie.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Construire une paire positive

<div class="lesson-columns">
<div>

Appliquer deux augmentations $t_1,t_2$ :

$$h_i=f_\theta(t_1(x)),\quad h_j=f_\theta(t_2(x)),\quad z_i=g_\theta(h_i).$$

</div>
<div>

La tête de projection $g$ produit l’espace où l’on calcule la perte. Pour une tâche aval, on peut conserver les caractéristiques $h$ de l’encodeur.

<AlertBlock>

Un recadrage qui retire l’objet ou une transformation qui détruit la géométrie peut imposer une invariance nuisible.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# InfoNCE : reconnaître le positif parmi des candidats

<div class="lesson-columns">
<div>

Pour une ancre $i$, un positif $j$ et les candidats $\mathcal C_i$ :

$$\ell_i=-\log\frac{\exp(s(z_i,z_j)/\tau)}{\sum_{k\in\mathcal C_i}\exp(s(z_i,z_k)/\tau)}.$$

</div>
<div>

$s$ est souvent la similarité cosinus ; le positif est inclus dans le dénominateur, l’ancre elle-même est exclue.

**Interprétation** : une classification où la bonne réponse est l’autre vue compatible.

</div>
</div>

---
hideInToc: true
---

# Effet de la température sur InfoNCE

<div class="lesson-columns">
<div>

Pour des représentations vectorielles normalisés :

$$s(z_i,z_j)=z_i^\top z_j,\qquad \tau>0.$$

</div>
<div>

- Petite $\tau$ : la distribution se concentre sur les meilleurs candidats.
- Grande $\tau$ : les scores deviennent moins contrastés.

<AlertBlock>

Une faible température peut concentrer le gradient sur des négatifs très difficiles, y compris des faux négatifs.

</AlertBlock>

La température doit être examinée avec la taille du lot et la qualité des paires.

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Température et poids contrastifs

<DemoFrame>
<InfoNCEDemo />
</DemoFrame>

<p class="demo-caption">Les similarités restent fixes ; seules la distribution des poids et la perte changent.</p>

---
hideInToc: true
---

# Faux négatifs et métadonnées temporelles

<div class="lesson-columns">
<div>

Les autres observations du mini-lot servent souvent de négatifs. Une file de descripteurs augmente leur nombre sans augmenter autant la mémoire des activations.

</div>
<div>

En robotique, deux images différentes peuvent montrer le même lieu ou le même objet.

<InfoBlock>

Écarter les observations trop proches dans le temps ou les paires potentiellement correspondantes réduit les faux négatifs. Ce filtrage exploite les métadonnées disponibles.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Effondrement des représentations

<div class="lesson-columns">
<div>

Avec seulement une perte $\|f(t_1(x))-f(t_2(x))\|^2$, la solution constante $f(x)=c$ minimise la perte pour toutes les données.

C’est l’**effondrement des représentations** : tous les exemples ont le même vecteur et aucune information utile ne subsiste.

</div>
<div>

<ExampleBlock>

Une perte prétexte nulle ne signifie donc pas que l’encodeur distingue les scènes.

</ExampleBlock>

L’objectif ou l’architecture doit exclure les solutions constantes.

</div>
</div>

---
hideInToc: true
---

# Encodeur à moyenne mobile exponentielle

<div class="lesson-columns">
<div>

Rappel : un enseignant EMA suit lentement les paramètres d’un élève :

$$\theta_T\leftarrow\mu\theta_T+(1-\mu)\theta_S.$$

</div>
<div>

L’élève prédit une représentation d’une autre vue produite par l’enseignant, avec un **arrêt du gradient** sur la cible.

Un prédicteur asymétrique et d’autres mécanismes de normalisation ou de diversité complètent le dispositif.

<AlertBlock>

L’absence d’effondrement dépend aussi du prédicteur, de la normalisation et de l’objectif ; elle se vérifie sur les représentations obtenues.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Prédiction asymétrique sans négatifs

<div class="lesson-columns">
<div>

Une forme de perte de type BYOL compare des vecteurs normalisés :

$$\ell=\left\|\overline{q_S(z_S(t_1(x)))}-\operatorname{sg}\!\left(\overline{z_T(t_2(x))}\right)\right\|_2^2.$$

</div>
<div>

$\operatorname{sg}$ signifie « traiter la cible comme constante ». Le prédicteur $q_S$ existe côté élève.

<InfoBlock>

Évaluer la variance des représentations vectorielles et leur performance aval aide à repérer un apprentissage dégénéré.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Rappel : attention sur une séquence de tokens

<div class="lesson-columns">
<div>

Les produits scalaires entre requêtes et clés définissent les poids d’agrégation des valeurs ; $d_k$ est la dimension des clés :

$$Y=\operatorname{softmax}(QK^\top/\sqrt{d_k})V.$$

</div>
<div>

Un token peut représenter une région de l’image. Pour traiter une image avec un transformer, il faut construire cette séquence de tokens tout en conservant leur position.

<ExampleBlock>

Le réseau doit pouvoir relier une roue à la carrosserie située dans une autre région.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Vision transformer : découper l’image en patchs

<div class="lesson-columns">
<div>

Une image $H\times W$ est découpée en patchs $P\times P$. Il y a $N=HW/P^2$ patchs.

Chaque patch aplati est projeté en un vecteur de dimension $d$, auquel on ajoute une information de position.

</div>
<div>

<ExampleBlock>

Une image $224\times224$ avec des patchs $16\times16$ donne 196 tokens.

</ExampleBlock>

Les petites structures peuvent disparaître à l’intérieur d’un patch ; réduire sa taille augmente le coût de l’attention.

</div>
</div>

---
hideInToc: true
---

# Autoencodeur et perte de reconstruction

<div class="lesson-columns">
<div>

Un encodeur produit un code $z=f(x)$ ; un décodeur reconstruit $\hat x=g(z)$.

$$\ell_{\mathrm{rec}}=\ell(g(f(x)),x).$$

</div>
<div>

Sans contrainte, le réseau peut apprendre une copie peu utile. Réduire le code, corrompre l’entrée ou masquer des régions rend la tâche informative.

<InfoBlock>

La qualité des reconstructions et celle des caractéristiques pour une tâche robotique sont deux critères différents.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# MAE : reconstruction de patchs masqués

<div class="lesson-columns">
<div>

L’encodeur traite seulement les patchs visibles. Un décodeur plus léger reçoit leurs codes et des tokens de masque pour reconstruire les patchs manquants.

$$L=\frac1{|\mathcal M|}\sum_{i\in\mathcal M}\|\hat x_i-x_i\|^2.$$

</div>
<div>

La perte porte ici sur les positions masquées $\mathcal M$.

<ExampleBlock>

Pour compléter une roue partiellement cachée, l’encodeur doit exploiter le contexte visuel de l’objet.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Taux de masquage et cibles de reconstruction

<DemoFrame>
<MaskedPatchesDemo />
</DemoFrame>

<p class="demo-caption">Faire varier le taux de masquage ; les positions masquées restent connues du décodeur.</p>

<!--
La démonstration montre le masque et les cibles observables ; elle ne simule pas un réseau entraîné ni une reconstruction apprise.
-->

---
hideInToc: true
class: figure-slide
---

# Architecture d’un autoencodeur masqué

Distinguer les deux coûts : encoder les seuls patchs visibles, puis reconstruire l’ensemble avec un petit décodeur.

Après pré-entraînement, l’encodeur peut être transféré à une tâche robotique sans conserver le décodeur de reconstruction.

<div class="figure-panel">
<img class="figure" src="./images/mae-architecture.png" alt="He et al." />
<p class="citation"><a href="https://arxiv.org/abs/2111.06377" target="_blank" rel="noopener">He et al. — Masked Autoencoders, CVPR 2022. Architecture.</a></p>
</div>

---
hideInToc: true
---

# Masquer un nuage de points

<div class="lesson-columns">
<div>

Créer des groupes locaux autour de centres, les encoder en tokens, puis masquer certains groupes.

Un décodeur peut reconstruire leurs coordonnées locales. Une distance entre ensembles, telle que Chamfer, évite d’exiger un ordre arbitraire des points.

</div>
<div>

<AlertBlock>

La position des centres et le mode de masquage peuvent divulguer une partie de la géométrie cible. Le protocole doit préciser ce qui est visible.

</AlertBlock>

Une représentation de type Point-MAE exploite ainsi la structure des nuages sans classes humaines.

</div>
</div>

---
hideInToc: true
---

# Pré-entraîner sur des données de conduite

<div class="lesson-columns">
<div>

Les volumes non annotés permettent de varier lieux, conditions et capteurs, mais leur redondance est forte.

</div>
<div>

- Échantillonner des séquences et conditions diversifiées.
- Garder les trajets de test hors pré-entraînement selon le protocole.
- Contrôler les doublons et les transformations géométriques.

<InfoBlock>

La redondance temporelle réduit la diversité effective des observations. Le protocole de collecte doit couvrir plusieurs environnements et conditions.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Sonde linéaire et ajustement fin

<div class="lesson-columns">
<div>

Geler l’encodeur $f$ puis apprendre seulement une tête linéaire :

$$\hat y=Wf(x)+b.$$

</div>
<div>

La **sonde linéaire** mesure les performances obtenues avec une transformation affine des caractéristiques gelées.

L’**ajustement fin** modifie aussi l’encodeur : il mesure ce que le système peut apprendre après adaptation.

<AlertBlock>

Les deux évaluations répondent à des questions différentes ; comparer avec les mêmes données annotées et le même budget.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Mesurer l’efficacité en annotations

<div class="lesson-columns">
<div>

Répéter une tâche aval avec différents nombres d’étiquettes : selon plusieurs tailles de sous-ensembles annotés.

Comparer initialisation aléatoire, pré-entraînement supervisé et auto-supervisé.

</div>
<div>

<ExampleBlock>

Si un encodeur atteint la même qualité de segmentation avec moins de masques annotés, il réduit le besoin d’annotation pour cette tâche précise.

</ExampleBlock>

Ajouter des mesures de latence et mémoire : la représentation la plus précise n’est pas forcément utilisable embarquée.

</div>
</div>

---
hideInToc: true
---

# Choisir une cohérence adaptée

| Signal | Hypothèse | Risque principal |
|---|---|---|
| Photométrie | Surfaces comparables entre vues | Mouvement, occultation, lumière |
| Contraste | Augmentations compatibles | Faux positifs ou négatifs |
| Auto-distillation | Cibles et diversité préservées | Effondrement |
| Masquage | Contexte informatif | Raccourcis de reconstruction |

<InfoBlock>

Évaluer l’effet des hypothèses de visibilité, d’invariance et de masquage sur la tâche cible.

</InfoBlock>
