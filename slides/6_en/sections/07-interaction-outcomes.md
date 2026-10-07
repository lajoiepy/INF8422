---
storyboard: S65
section: Learning action possibilities from experience
class: ssl-slide
clicks: 2
---

# Observation, action, outcome, target

<InteractionLearning :stage="$clicks" />



---
storyboard: S66
class: ssl-slide
clicks: 2
---

# Traversability depends on the robot

<PlatformTraversability :stage="$clicks" />



---
storyboard: S67
class: ssl-slide
clicks: 2
---

# Measuring traversal outcomes

<TerrainExperience mode="measure" :stage="$clicks" />



---
storyboard: S68
class: ssl-slide
clicks: 2
---

# Delayed supervision

<TerrainExperience mode="delay" :stage="$clicks" />



---
storyboard: S69
class: ssl-slide
clicks: 3
---

# Projecting experience into an earlier image

<TerrainExperience mode="project" :stage="$clicks" />



---
storyboard: S70
class: ssl-slide
clicks: 2
---

# Wild Visual Navigation

<div class="wvn-figure"><img src="../images/wvn-supervision.png" alt="Original WVN journal Figure 5, both supervision and mission graph panels with footprint reprojection into earlier images" /></div>

<div class="wvn-explanation"><div><b>Visual input</b><span>RGB images and pretrained visual features</span></div><div v-if="$clicks>=1"><b>Measured signal</b><span>Commanded versus estimated planar velocity</span></div><div v-if="$clicks>=2"><b>Accumulated supervision</b><span>Footprint scores reprojected into stored images</span></div></div>

<div class="ssl-caption">Experienced motion supplies targets for visual traversability estimation.</div>

<SSLControls />
<div class="citation"><a href="https://link.springer.com/article/10.1007/s10514-025-10202-x">Mattamala et al., WVN, Autonomous Robots 2025 · Fig. 5(a,b), journal PDF page 6</a></div>



---
storyboard: S71
class: ssl-slide
clicks: 2
---

# Measured outcomes and unvisited terrain

<TerrainExperience mode="coverage" :stage="$clicks" />



---
storyboard: S72
class: ssl-slide
clicks: 2
---

# Manipulation affordances

<CabinetInteraction mode="affordance" :stage="$clicks" />



---
storyboard: S73
class: ssl-slide
clicks: 2
---

# Predicting an action's outcome

<CabinetInteraction mode="predict" :stage="$clicks" />



---
storyboard: S74
class: ssl-slide
clicks: 3
---

# Automatically constructing an affordance target

<CabinetInteraction mode="execute" :stage="$clicks" />



---
storyboard: S75
class: ssl-slide
clicks: 2
---

# Losses for interaction-derived targets

<OutcomeLoss :stage="$clicks" />



---
storyboard: S76
class: ssl-slide
clicks: 2
---

# ActAIM as an interaction-learning example

<ActAIMSchematic :stage="$clicks" />



---
storyboard: S77
class: ssl-slide
clicks: 2
---

# Imperfect targets and selected experience

<TargetValidity :stage="$clicks" />



---
storyboard: S78
class: ssl-slide
clicks: 2
---

# The shared learning principle

<InteractionLearning mode="synthesis" :stage="$clicks" />


