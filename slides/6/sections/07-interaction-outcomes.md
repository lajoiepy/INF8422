---
storyboard: S65
section: Apprendre les possibilités d’action par l’expérience
class: ssl-slide
clicks: 2
---

# Observation, action, résultat, cible

<InteractionLearning :stage="$clicks" />



---
storyboard: S66
class: ssl-slide
clicks: 2
---

# La traversabilité dépend du robot

<PlatformTraversability :stage="$clicks" />



---
storyboard: S67
class: ssl-slide
clicks: 2
---

# Mesurer les résultats de traversée

<TerrainExperience mode="measure" :stage="$clicks" />



---
storyboard: S68
class: ssl-slide
clicks: 2
---

# Supervision différée

<TerrainExperience mode="delay" :stage="$clicks" />



---
storyboard: S69
class: ssl-slide
clicks: 3
---

# Projeter l’expérience dans une image antérieure

<TerrainExperience mode="project" :stage="$clicks" />



---
storyboard: S70
class: ssl-slide
clicks: 2
---

# Wild Visual Navigation

<div class="wvn-figure"><img src="../images/wvn-supervision.png" alt="WVN figure 5 originale du journal, graphes de supervision et de mission, reprojection d’empreintes dans les vues antérieures" /></div>

<div class="wvn-explanation"><div><b>Entrée visuelle</b><span>Images RVB et caractéristiques visuelles préentraînées</span></div><div v-if="$clicks>=1"><b>Signal mesuré</b><span>Vitesse plane commandée et estimée</span></div><div v-if="$clicks>=2"><b>Supervision accumulée</b><span>Scores d’empreintes reprojetés dans les images stockées</span></div></div>

<div class="ssl-caption">Le mouvement expérimenté fournit des cibles d’estimation visuelle de traversabilité.</div>

<SSLControls />
<div class="citation"><a href="https://link.springer.com/article/10.1007/s10514-025-10202-x">Mattamala et al., WVN, Autonomous Robots 2025 · Fig. 5(a,b), page 6 du PDF du journal</a></div>



---
storyboard: S71
class: ssl-slide
clicks: 2
---

# Résultats mesurés et terrain non visité

<TerrainExperience mode="coverage" :stage="$clicks" />



---
storyboard: S72
class: ssl-slide
clicks: 2
---

# Possibilités d’action en manipulation

<CabinetInteraction mode="affordance" :stage="$clicks" />



---
storyboard: S73
class: ssl-slide
clicks: 2
---

# Prédire le résultat d’une action

<CabinetInteraction mode="predict" :stage="$clicks" />



---
storyboard: S74
class: ssl-slide
clicks: 3
---

# Construire automatiquement une cible d’action

<CabinetInteraction mode="execute" :stage="$clicks" />



---
storyboard: S75
class: ssl-slide
clicks: 2
---

# Pertes pour les cibles issues d’interactions

<OutcomeLoss :stage="$clicks" />



---
storyboard: S76
class: ssl-slide
clicks: 2
---

# ActAIM : apprendre à partir d’interactions

<ActAIMSchematic :stage="$clicks" />



---
storyboard: S77
class: ssl-slide
clicks: 2
---

# Cibles imparfaites et expérience sélectionnée

<TargetValidity :stage="$clicks" />



---
storyboard: S78
class: ssl-slide
clicks: 2
---

# Le principe d’apprentissage commun

<InteractionLearning mode="synthesis" :stage="$clicks" />


