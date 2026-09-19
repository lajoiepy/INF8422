---
layout: section
---

# Intentions humaines

Prédiction multimodale de trajectoires et inférence des interactions personne–objet.

---
hideInToc: true
---

# Détection, suivi et anticipation des personnes

<div class="lesson-columns">
<div>

Un système peut détecter une personne, maintenir son identité, estimer ses points-clés et prévoir son déplacement.

</div>
<div>

Ces sorties décrivent différents niveaux : présence, mouvement corporel, trajectoire et but possible.

<AlertBlock>

Une intention n’est pas directement mesurée par un détecteur. Elle est inférée à partir d’indices et peut changer.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Rappel : détection, association et pose humaine

<div class="lesson-columns">
<div>

La détection localise les personnes. L’association relie les observations dans le temps. Une tête de pose humaine prédit articulations ou points-clés.

</div>
<div>

<ExampleBlock>

Position du corps, orientation et mouvement d’un bras apportent des indices complémentaires pour comprendre une interaction avec une porte.

</ExampleBlock>

Occlusions et changements d’identité perturbent toutes les prédictions qui dépendent de l’historique.

</div>
</div>

---
hideInToc: true
---

# Supervision par trajectoires enregistrées

<div class="lesson-columns">
<div>

Pour un historique $X_{-L:0}$, la trajectoire enregistrée $Y_{1:H}$ fournit une cible :

$$\hat Y=f_\theta(X_{-L:0},\text{scène}).$$

</div>
<div>

$L+1$ observations forment l’historique et $H$ instants définissent l’horizon. L’entraînement est supervisé par les observations futures, sans nécessairement demander une annotation humaine de chaque position.

<InfoBlock>

Le prédicteur n’accède qu’au passé au moment de l’usage. La cible future sert uniquement à construire la perte et l’évaluation.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Multimodalité des trajectoires futures

<div class="lesson-columns">
<div>

Une personne approche une intersection. Elle peut tourner, continuer ou s’arrêter.

Une régression quadratique vers une seule trajectoire tend à moyenner les futurs observés dans des situations semblables.

</div>
<div>

<ExampleBlock>

La moyenne de deux passages à gauche et à droite peut traverser un obstacle central.

</ExampleBlock>

Une représentation **multimodale** conserve les trajectoires distinctes compatibles avec le contexte.

</div>
</div>

---
hideInToc: true
---

# Contraintes de scène et interactions sociales

<div class="lesson-columns">
<div>

Les trottoirs, portes et obstacles structurent les mouvements possibles.

</div>
<div>

Les autres agents ajoutent des interactions : céder le passage, suivre un groupe, éviter une collision.

<InfoBlock>

Le même historique individuel peut mener à des futurs différents selon la configuration des voisins et des objets accessibles.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Attention temporelle et attention entre agents

<div class="lesson-columns">
<div>

Encoder l’historique de chaque agent, puis échanger entre agents :

$$h_i'=\sum_j a_{ij}Vh_j.$$

</div>
<div>

Les poids $a_{ij}$ peuvent dépendre des positions relatives, orientations et caractéristiques de mouvement.

<ExampleBlock>

Le modèle peut attribuer un poids élevé à un agent dont la trajectoire croise celle de l’agent étudié.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Prédire une distribution de futurs

<div class="lesson-columns">
<div>

Un modèle génératif décrit des sorties possibles conditionnellement au contexte $x$ :

$$Y\sim p_\theta(Y\mid x).$$

</div>
<div>

Le système peut échantillonner des trajectoires ou produire plusieurs hypothèses pondérées.

<InfoBlock>

La multimodalité désigne ici la présence de plusieurs modes dans la distribution des trajectoires, comme deux directions de passage distinctes.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Mélanges : plusieurs composantes explicites

<div class="lesson-columns">
<div>

Un mélange représente :

$$p(Y\mid x)=\sum_{k=1}^{K}\pi_k(x)\,p_k(Y\mid x),\qquad \sum_k\pi_k=1.$$

</div>
<div>

Une tête prédit les poids et paramètres des composantes. L’entraînement minimise la log-vraisemblance négative de la trajectoire observée.

<ExampleBlock>

Des composantes peuvent représenter passer à gauche, passer à droite ou s’arrêter.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Composantes d’un mélange et buts sémantiques

<div class="lesson-columns">
<div>

Plusieurs composantes peuvent produire presque le même futur, ou une composante peut représenter plusieurs comportements.

Le choix de paramétrisation temporelle et de régularisation influence leur diversité.

</div>
<div>

<AlertBlock>

Un indice de composante n’est pas une étiquette sémantique d’intention, sauf si un signal supplémentaire lui donne ce rôle.

</AlertBlock>

Évaluer couverture des comportements et plausibilité de chaque sortie.

</div>
</div>

---
hideInToc: true
---

# Winner-takes-all : apprendre avec plusieurs hypothèses

<div class="lesson-columns">
<div>

Le réseau prédit $K$ trajectoires ; seule la plus proche de la cible reçoit la perte de régression :

$$L_{\mathrm{WTA}}=\min_k d(\hat Y_k,Y).$$

</div>
<div>

Une tête de scores peut apprendre à classer les hypothèses à partir de leur correspondance aux cibles.

<InfoBlock>

Cette stratégie permet des modes distincts, mais peut laisser des hypothèses inutilisées ou privilégier la couverture des cibles sans fournir une règle de sélection des trajectoires.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# CVAE : introduire une variable latente

<div class="lesson-columns">
<div>

Un autoencodeur variationnel conditionnel introduit un code $z$ qui représente les variations non déterminées par le contexte $x$.

</div>
<div>

- À l’entraînement, $q_\phi(z\mid x,Y)$ observe aussi le futur cible.
- Un décodeur $p_\theta(Y\mid x,z)$ reconstruit ce futur.
- Une loi a priori $p_\theta(z\mid x)$ est disponible sans le futur.

<ExampleBlock>

Différents codes peuvent produire différents passages autour d’un groupe de personnes.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# La perte d’un CVAE

<div class="lesson-columns">
<div>

$$L=\mathbb E_{q_\phi}\big[-\log p_\theta(Y\mid x,z)\big]+\beta\,\operatorname{KL}\big(q_\phi(z\mid x,Y)\|p_\theta(z\mid x)\big).$$

</div>
<div>

La reconstruction encourage un futur fidèle à la cible. La KL rapproche la distribution des codes d’entraînement de la loi a priori utilisable à l’inférence.

<InfoBlock>

La KL vaut $\int q(z)\log(q(z)/p(z))\,dz$ : elle pénalise leur écart, sans être une distance symétrique.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Réparamétrer pour faire passer le gradient

<div class="lesson-columns">
<div>

Pour un code gaussien diagonal :

$$\epsilon\sim\mathcal N(0,I),\qquad z=\mu_\phi(x,Y)+\sigma_\phi(x,Y)\odot\epsilon.$$

</div>
<div>

L’aléa est isolé dans $\epsilon$ ; les paramètres $\mu$ et $\sigma$ restent différentiables.

<AlertBlock>

Si le décodeur ignore $z$, les trajectoires deviennent peu diverses : c’est un effondrement du latent, distinct d’une bonne reconstruction moyenne.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Utiliser un CVAE sans connaître le futur

<div class="lesson-columns">
<div>

À l’inférence :

</div>
<div>

1. Encoder le contexte observé.
2. Échantillonner $z$ depuis la loi a priori conditionnelle.
3. Décoder une trajectoire.
4. Répéter pour obtenir plusieurs futurs.

<AlertBlock>

Échantillonner depuis l’encodeur qui a vu le futur cible pendant l’évaluation introduirait une fuite d’information.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Diffusion : apprendre à retirer du bruit

<div class="lesson-columns">
<div>

Une trajectoire cible $Y^{(0)}$ est progressivement bruitée. Un réseau apprend à reconnaître le bruit ajouté, en étant conditionné par la scène et l’historique.

</div>
<div>

À la génération, on part d’un bruit puis on applique des étapes de débruitage pour obtenir une trajectoire.

<ExampleBlock>

Deux bruits initiaux peuvent conduire à deux passages distincts autour d’un obstacle.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Le processus de bruitage

<div class="lesson-columns">
<div>

Une écriture directe d’une étape de bruitage est :

$$Y^{(k)}=\sqrt{\bar\alpha_k}Y^{(0)}+\sqrt{1-\bar\alpha_k}\epsilon,\qquad \epsilon\sim\mathcal N(0,I).$$

</div>
<div>

$\bar\alpha_k$ décroît avec le niveau de bruit. Le réseau reçoit $Y^{(k)}$, cet indice $k$ et le contexte $x$.

<InfoBlock>

L’indice $k$ désigne l’étape de diffusion. Le temps physique de la trajectoire reste noté $t$.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Apprendre le débruitage

<div class="lesson-columns">
<div>

Une perte courante supervise le bruit injecté :

$$L=\mathbb E_{k,Y^{(0)},\epsilon}\|\epsilon-\epsilon_\theta(Y^{(k)},k,x)\|_2^2.$$

</div>
<div>

Le réseau apprend comment la trajectoire peut être structurée compte tenu du contexte.

<AlertBlock>

La perte de débruitage doit être complétée par une évaluation des collisions et de la plausibilité des trajectoires sur des scènes indépendantes.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Coût de l’échantillonnage par diffusion

<div class="lesson-columns">
<div>

Un échantillonneur utilise les prédictions de bruit pour transformer progressivement une trajectoire aléatoire.

Le nombre d’étapes et d’hypothèses affecte la latence.

</div>
<div>

<InfoBlock>

Accélérer l’échantillonnage ou distiller le modèle peut réduire ce coût, mais le compromis qualité–temps doit être mesuré sur la tâche robotique.

</InfoBlock>

Le budget de génération doit tenir compte de la cadence requise par le système.

</div>
</div>

---
hideInToc: true
---

# Comparer les façons de produire plusieurs futurs

| Méthode | Représentation de la diversité | Limite |
|---|---|---|
| Mélange | Composantes pondérées | Forme des composantes |
| Winner-takes-all | Hypothèses explicites | Couverture et scores |
| CVAE | Codes latents échantillonnés | Utilisation du latent |
| Diffusion | Débruitage conditionnel | Nombre d’étapes |

Toutes doivent être évaluées à nombre d’hypothèses et budget de calcul déclarés.

---
hideInToc: true
---

# ADE et FDE : deux erreurs complémentaires

<div class="lesson-columns">
<div>

Pour une hypothèse et une cible à $H$ instants :

$$\operatorname{ADE}=\frac1H\sum_{t=1}^{H}\|\hat y_t-y_t\|_2,\qquad\operatorname{FDE}=\|\hat y_H-y_H\|_2.$$

</div>
<div>

ADE mesure la trajectoire entière ; FDE mesure son point final.

<ExampleBlock>

Une trajectoire peut arriver au bon endroit en passant par une zone impossible. Une faible FDE ne suffit pas.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# minADE et minFDE utilisent un oracle

<div class="lesson-columns">
<div>

Avec $K$ hypothèses :

$$\operatorname{minADE}_K=\min_k\operatorname{ADE}_k,\qquad\operatorname{minFDE}_K=\min_k\operatorname{FDE}_k.$$

</div>
<div>

La meilleure hypothèse est choisie **en connaissant le futur réel**. Les deux minima peuvent provenir d’hypothèses différentes.

<AlertBlock>

Ces métriques mesurent la couverture des futurs ; elles ne disent pas si le robot sait sélectionner la bonne hypothèse.

</AlertBlock>

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Nombre d’hypothèses et métriques oracle

<DemoFrame>
<MultimodalFutureDemo />
</DemoFrame>

<p class="demo-caption">Faire varier le nombre de futurs et la cible : comparer moyenne, minimum et trajectoires physiquement admissibles.</p>

---
hideInToc: true
---

# Évaluer au-delà du meilleur échantillon

<div class="lesson-columns">
<div>

Rapporter $K$, horizon, fréquence et budget de génération.

</div>
<div>

Examiner aussi collisions, sortie du domaine praticable, diversité et comportement de la sélection réellement utilisée.

<InfoBlock>

Ajouter des trajectoires supplémentaires ne peut pas augmenter un minimum sur un ensemble conservé. Une baisse de minADE peut donc venir du budget d’échantillonnage.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Comprendre une vidéo avec un modèle vision-langage

<div class="lesson-columns">
<div>

Encoder plusieurs images et leurs positions temporelles permet de demander une activité, un geste ou un but possible.

</div>
<div>

L’échantillonnage des images détermine ce que le modèle peut observer : un contact bref peut disparaître entre deux vues.

<ExampleBlock>

« Une personne tend la main vers une tasse » nécessite de relier posture, objet et évolution dans le temps.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# L’intention comme relation personne–objet

<div class="lesson-columns">
<div>

Représenter un candidat sous la forme :

$$\langle\text{personne},\text{action possible},\text{objet cible}\rangle.$$

</div>
<div>

Les trajectoires et gestes fournissent des indices ; la carte sémantique fournit les objets et leurs positions.

<AlertBlock>

Une main proche d’une poignée peut vouloir ouvrir la porte, s’y appuyer ou passer à côté. Distinguer observation et hypothèse de but.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Latence et coût d’une mauvaise anticipation

<div class="lesson-columns">
<div>

Une décision peut devenir inadaptée si le mouvement a changé pendant le calcul.

Une erreur sur un piéton proche n’a pas le même effet qu’une erreur sur une personne lointaine.

</div>
<div>

<InfoBlock>

La chaîne robotique doit comparer les prédictions à la géométrie actuelle et aux contraintes de mouvement, avec une stratégie définie lorsque les indices sont insuffisants.

</InfoBlock>

Inclure dans l’évaluation des situations d’arrêt, de changement de direction et d’occultation.

</div>
</div>

---
hideInToc: true
---

# Ouverture : vision, langage et action

<div class="lesson-columns">
<div>

Un modèle vision-langage-action conditionne une sortie d’action sur observations et instruction.

La représentation relie alors perception et commande dans une même chaîne.

</div>
<div>

<AlertBlock>

Produire une action plausible exige encore une compatibilité avec le corps, les contacts et l’état du monde. Les principes de perception et d’évaluation restent nécessaires.

</AlertBlock>

L’espace d’action et la fréquence des commandes dépendent de la plateforme robotique.

</div>
</div>
