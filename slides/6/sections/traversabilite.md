---
layout: section
---

# Traversabilité

Apprentissage à partir des passages et des mesures proprioceptives.

---
hideInToc: true
---

# Coût de traversabilité à partir des classes de terrain

<div class="lesson-columns">
<div>

Une approche supervisée classe les terrains puis associe un coût à chaque classe : route, herbe, gravier, obstacle.

Mais la relation classe–coût dépend du robot et de sa vitesse.

</div>
<div>

<ExampleBlock>

Une herbe haute peut cacher un sol ferme ; une surface plane peut être de la boue où les roues s’enfoncent.

</ExampleBlock>

La traversabilité décrit une interaction entre le terrain, le corps et une condition de déplacement.

</div>
</div>

---
hideInToc: true
---

# Propriétés géométriques, visuelles et mécaniques

<div class="lesson-columns">
<div>

La pente et la rugosité renseignent sur la forme. La couleur et la texture renseignent sur l’apparence.

Ni l’une ni l’autre ne mesure directement l’adhérence, la résistance ou la déformation sous la charge.

</div>
<div>

<InfoBlock>

Les mesures proprioceptives pendant le passage peuvent relier une apparence observée à son coût réel pour ce robot.

</InfoBlock>

Il faut cependant distinguer le terrain des effets de vitesse, de commande et de charge.

</div>
</div>

---
hideInToc: true
---

# Construire l’empreinte d’un passage

<div class="lesson-columns">
<div>

Les poses enregistrées et la géométrie du robot définissent la bande de terrain effectivement parcourue.

</div>
<div>

Transporter cette bande dans le repère d’une image passée, puis la projeter, associe l’expérience à l’apparence observée avant le contact.

<AlertBlock>

Utiliser l’empreinte des roues ou du corps pertinente, pas une simple ligne de centres. Vérifier la visibilité et l’alignement temporel.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Rappel : projeter une expérience dans une image

<div class="lesson-columns">
<div>

Pour un point de contact $X_r$ au temps du passage et une caméra passée :

$$X_c=R_{c\leftarrow r}X_r+t_{c\leftarrow r},\qquad u=\pi(KX_c).$$

</div>
<div>

La transformation compose le déplacement du robot et l’extrinsèque du capteur.

<ExampleBlock>

Une vibration mesurée maintenant peut étiqueter la région qui était visible plusieurs instants avant le passage.

</ExampleBlock>

Les erreurs de pose et les délais capteurs peuvent déplacer l’étiquette sur un terrain voisin.

</div>
</div>

---
hideInToc: true
---

# Passage réussi et étiquette positive

<div class="lesson-columns">
<div>

Une trace réussie indique une région **praticable dans les conditions observées**.

Une région non parcourue reste non étiquetée : l’absence de passage peut résulter du choix de trajectoire.

</div>
<div>

<AlertBlock>

Étiqueter les régions hors trace comme négatives confond le choix de trajectoire avec l’impraticabilité.

</AlertBlock>

Le jeu de données contient donc des positifs et des exemples non étiquetés.

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Régions parcourues et régions non étiquetées

<DemoFrame>
<PositiveUnlabeledDemo />
</DemoFrame>

<p class="demo-caption">Afficher les traces connues, puis révéler le terrain caché pour distinguer non observé et négatif.</p>

---
hideInToc: true
---

# Apprentissage positif–non étiqueté

<div class="lesson-columns">
<div>

Avec la proportion de positifs $\pi_p$, un risque binaire peut s’écrire :

$$R=\pi_p \mathbb E_P[\ell(f(x),1)]+\mathbb E_U[\ell(f(x),0)]-\pi_p \mathbb E_P[\ell(f(x),0)].$$

</div>
<div>

Le terme non étiqueté contient positifs et négatifs ; la soustraction corrige la contribution des positifs comptés comme négatifs.

<AlertBlock>

Cette décomposition suppose des conditions sur l’échantillonnage des positifs et une proportion exploitable. Les traces choisies par un robot sont souvent biaisées.

</AlertBlock>

</div>
</div>

<!--
Dériver E_U=pi_p E_P+(1-pi_p)E_N pour la perte négative. Signaler les variantes à risque non négatif sans développer toute leur théorie.
-->



---
hideInToc: true
---

# Le biais des trajectoires choisies

<div class="lesson-columns">
<div>

Le robot parcourt préférentiellement les terrains déjà faciles à reconnaître.

Les positifs observés peuvent donc surreprésenter les routes lisses et ignorer des zones praticables mais peu familières.

</div>
<div>

<ExampleBlock>

Un modèle qui ne voit jamais de gravier en expérience ne peut pas conclure qu’il est impraticable.

</ExampleBlock>

Séparer l’évaluation sur terrains réellement testés de la généralisation à des terrains sans expérience.

</div>
</div>

---
hideInToc: true
---

# Détection d’anomalies par reconstruction

<div class="lesson-columns">
<div>

Entraîner un autoencodeur sur les régions de passage connues, puis mesurer :

$$a(x)=\|g(f(x))-x\|^2.$$

</div>
<div>

Une forte erreur de reconstruction peut signaler une apparence inhabituelle.

<AlertBlock>

Le score mesure un écart d’apparence : un éclairage nouveau peut augmenter l’erreur, tandis qu’un terrain à faible adhérence peut être bien reconstruit.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Apprentissage à une classe

<div class="lesson-columns">
<div>

Une représentation peut être entraînée à concentrer les exemples familiers autour d’un centre $c$ :

$$L=\frac1N\sum_i\|f_\theta(x_i)-c\|^2+\lambda\Omega(\theta).$$

</div>
<div>

La distance au centre sert de score d’écart. L’architecture et les contraintes doivent éviter la solution constante.

<InfoBlock>

Le seuil de familiarité doit être validé sur des terrains séparés. Il ne remplace pas une mesure du coût physique.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Vibrations et coût de passage

<div class="lesson-columns">
<div>

Une IMU peut mesurer l’énergie des accélérations dans une fenêtre, après compensation de la gravité et choix d’un filtrage.

$$c_{\mathrm{vib}}=\sqrt{\frac1M\sum_{k=1}^{M}(a_z(k)-\bar a_z)^2}.$$

</div>
<div>

<ExampleBlock>

Des cailloux peuvent produire des vibrations fortes malgré une pente faible.

</ExampleBlock>

Vitesse, suspension et montage du capteur influencent cette mesure : comparer à conditions définies ou les fournir au modèle.

</div>
</div>

---
hideInToc: true
---

# Glissement et effort moteur

<div class="lesson-columns">
<div>

Le glissement peut être estimé en comparant vitesse de roue et vitesse du corps ; l’effort peut être approché par courant ou couple moteur.

Un indicateur simple de glissement longitudinal :

$$s=\frac{|v_{\mathrm{roue}}-v_{\mathrm{corps}}|}{\max(|v_{\mathrm{roue}}|,|v_{\mathrm{corps}}|,\epsilon)}.$$

</div>
<div>

<AlertBlock>

Un virage, une accélération ou une estimation de vitesse erronée peut produire un signal élevé sans changement de terrain.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Régresser un coût continu

<div class="lesson-columns">
<div>

Associer la région visuelle passée à un coût mesuré $c$ :

$$\hat c=f_\theta(x,v,\text{état du robot}),\qquad L=\operatorname{smoothL1}(\hat c-c).$$

</div>
<div>

Un coût continu distingue des terrains tous traversables mais plus ou moins lents, inconfortables ou énergivores.

<ExampleBlock>

Pour la navigation, le coût peut refléter une vibration normalisée à vitesse fixée ; pour une autre mission, l’énergie consommée peut être plus pertinente.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Mesures de coût et propriétés physiques

| Mesure | Ce qu’elle renseigne | Propriété non mesurée directement |
|---|---|---|
| Vibration | Secousses pendant le passage | Adhérence |
| Glissement | Écart roue–corps | Portance sous une autre charge |
| Effort moteur | Demande mécanique | Absence de collision |

Définir les poids d’un coût composite selon la tâche. Les normalisations doivent être apprises ou fixées uniquement sur les données autorisées.

---
hideInToc: true
---

# Adapter une petite tête en ligne

<div class="lesson-columns">
<div>

Geler un encodeur pré-entraîné par auto-supervision et apprendre une petite tête :

$$z=f_{\mathrm{gelé}}(I),\qquad \hat c=h_\phi(z),\qquad \phi\leftarrow\phi-\eta\nabla_\phi L.$$

</div>
<div>

L’encodeur fournit des caractéristiques stables ; la tête relie ces caractéristiques aux mesures proprioceptives du robot sur le terrain courant.

<InfoBlock>

Le nombre réduit de paramètres limite le coût des mises à jour. La qualité de l’adaptation dépend des informations conservées par l’encodeur gelé.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Disponibilité temporelle des étiquettes

<div class="lesson-columns">
<div>

**Observer → conserver la région → passer → mesurer → associer → mettre à jour.**

La mise à jour ne doit utiliser que les expériences déjà arrivées.

</div>
<div>

<ExampleBlock>

Au moment de choisir un trajet, le robot ne connaît pas encore le coût mesuré après son passage. Ce coût devient disponible pour les décisions ultérieures.

</ExampleBlock>

Horodatage, mémoire des observations et fréquence de mise à jour font partie du système.

</div>
</div>

---
hideInToc: true
---

# Oubli catastrophique

<div class="lesson-columns">
<div>

En apprenant uniquement sur une nouvelle surface, le modèle peut perdre une compétence acquise sur les autres.

Les gradients récents modifient les mêmes paramètres que ceux utilisés pour les terrains anciens.

</div>
<div>

<AlertBlock>

L’adaptation à la boue peut dégrader les prédictions sur le gravier : cette rétention doit être mesurée.

</AlertBlock>

Évaluer à la fois l’amélioration sur le terrain actuel et la rétention sur des expériences antérieures.

</div>
</div>

---
hideInToc: true
---

# Rejeu : mélanger ancien et récent

<div class="lesson-columns">
<div>

Conserver un petit tampon d’expériences et construire des mini-lots mixtes :

$$L=\alpha L_{\mathrm{récent}}+(1-\alpha)L_{\mathrm{rejeu}}.$$

</div>
<div>

Le tampon doit préserver la diversité des conditions de passage, y compris les terrains peu fréquents.

<InfoBlock>

Le rejeu échange mémoire et stabilité contre vitesse d’adaptation. Une ancienne cible devenue non représentative peut aussi gêner l’apprentissage.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Évaluer une adaptation pendant le déploiement

<div class="lesson-columns">
<div>

Rejouer les observations **dans leur ordre temporel**, avec la disponibilité réelle des étiquettes.

Mesurer : erreur de coût, délai d’adaptation, oubli et temps de calcul.

</div>
<div>

Comparer tête fixe, tête adaptée et adaptation avec rejeu.

<AlertBlock>

Un mélange aléatoire des images avant entraînement permet d’apprendre le terrain futur trop tôt et surestime les performances en ligne.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Traversabilité apprise par proprioception

<div class="lesson-columns">
<div>

Le signal vient de la rencontre entre **terrain, robot et commande**.

</div>
<div>

- Une trace réussie fournit un positif local.
- Une région non parcourue reste non étiquetée.
- La proprioception apporte des coûts mesurés.
- L’apprentissage en ligne adapte leur prédiction visuelle.

<ExampleBlock>

La traversabilité d’un même terrain peut différer pour un véhicule chenillé et un robot à roues. Les cibles doivent préciser la plateforme et les conditions d’essai.

</ExampleBlock>

</div>
</div>
