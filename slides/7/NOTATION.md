# Terminologie et notation

Les trois cours utilisent les conventions suivantes. Les dimensions, unités et indices locaux sont précisés lors de l’introduction d’une formule.

| Notation | Signification |
|---|---|
| $x$, $y$, $\hat y=f_\theta(x)$ | Observation, cible et prédiction ; le chapeau indique une estimation |
| $\mathcal D$, $N$ | Jeu de données et nombre d’exemples ; $N$ peut aussi compter les points ou tokens lorsque le contexte le précise |
| $\ell$, $L$ | Perte élémentaire et objectif agrégé sur les exemples, positions ou termes d’apprentissage |
| $\theta$, $\eta$ | Paramètres appris et taux d’apprentissage |
| $\theta_T$, $\theta_S$, $\mu$ | Paramètres de l’enseignant, de l’élève et coefficient EMA |
| $h$, $z$, $f(u)$ | Caractéristiques intermédiaires, représentation vectorielle et caractéristique locale au pixel $u$ |
| $Q$, $K$, $V$, $d_k$ | Requêtes, clés, valeurs et dimension des clés dans une attention |
| $\tau$ | Température du softmax, de l’apprentissage contrastif ou de la distillation |
| $\delta_{\mathrm{pseudo}}$ | Seuil de sélection des pseudo-étiquettes |
| $u$, $\tilde u$, $X$ | Coordonnées image, coordonnées image homogènes et point 3D |
| $K_c$ | Matrice intrinsèque de la caméra $c$ ; notée $K$ lorsqu’une seule caméra est considérée |
| $T_{b\leftarrow a}$ | Transformation rigide du repère $a$ vers le repère $b$, de rotation $R_{b\leftarrow a}$ et translation $t_{b\leftarrow a}$ |
| $D(u)$, $d$ | Carte de profondeur axiale et profondeur d’un pixel ; une profondeur inverse est explicitement identifiée |
| $r$, $\rho$ | Direction unitaire d’un rayon et portée le long de ce rayon : $X=o+\rho r$ |
| $v(X)$ | Flux de scène : déplacement 3D sur un intervalle donné, distinct d’une vitesse |
| $\sigma_i$, $\alpha_i$, $T_i$, $w_i$ | Densité, opacité, transmittance et poids de rendu d’un échantillon |
| $d_{\mathrm{Ch}}^{(r)}$ | Somme des deux moyennes directionnelles des distances aux plus proches voisins, à la puissance $r$ ; $r=1$ pour les polylignes, $r=2$ pour la perte de flux présentée |
| $t$, $H$, $K$ | Temps physique, nombre d’instants futurs et nombre d’hypothèses dans la prédiction de trajectoires |
| $Y^{(k)}$ | Trajectoire à l’étape de diffusion $k$ ; l’exposant distingue le bruitage du temps physique |

Un même symbole peut avoir un rôle local différent : $K$ pour les clés d’attention, les intrinsèques ou un nombre d’hypothèses ; $\rho$ pour une pénalité robuste ou une portée ; $r$ pour une direction ou une puissance. Ces rôles sont définis dans la formule concernée. Les indices descriptifs des pertes sont en caractères droits.

| Terme retenu | Usage |
|---|---|
| Caractéristique | Sortie intermédiaire d’un encodeur, locale ou globale |
| Représentation vectorielle (embedding) | Vecteur dans un espace appris |
| Descripteur | Représentation utilisée pour l’appariement ou la recherche ; « global » pour une observation entière |
| Token, patch | Unité d’une séquence ; région d’image utilisée pour former un token visuel |
| Requête, clé, valeur | Constituants de l’attention |
| Prompt | Indication de conditionnement d’un modèle ; distincte d’une requête d’objet apprise |
| Information a priori, loi a priori | Entrée disponible avant l’observation courante ; distribution du code latent pour un CVAE |
| Ajustement fin | Adaptation d’une partie ou de la totalité des paramètres d’un modèle pré-entraîné |
| Ego-mouvement, flux optique, flux de scène | Mouvement du capteur, déplacement image et déplacement 3D |
| Occultation, transmittance | Absence de visibilité d’une surface et fraction du signal transmis le long d’un rayon |

Les titres d’articles, noms de méthodes et acronymes bibliographiques conservent leur forme publiée.
