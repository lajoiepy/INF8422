---
storyboard: S32
section: Reconstruction and feature prediction
class: ssl-slide
clicks: 1
---

# Reconstruction as a training signal

<MaskedLearning mode="overview" :stage="$clicks" />

<div class="takeaway">The original observation supplies a target without a human annotation.</div>



---
storyboard: S33
class: ssl-slide
clicks: 2
---

# Visible and masked patches

<MaskedLearning mode="mask" :stage="$clicks" />



---
storyboard: S34
class: ssl-slide
clicks: 3
---

# MAE architecture

<MaskedLearning mode="architecture" :stage="$clicks" />



---
storyboard: S35
class: ssl-slide
clicks: 2
---

# Reconstruction loss on masked locations

<MaskedLearning mode="loss" :stage="$clicks" />



---
storyboard: S36
class: ssl-slide
clicks: 1
---

# Plausible reconstruction and ambiguity

<div class="ambiguity-layout">
  <div class="ambiguity-examples">
    <div class="ambiguity-labels"><span>Masked input</span><span>MAE reconstruction</span><span>Original image</span></div>
    <img src="../images/mae-ambiguity.png" alt="Two original COCO triplets from MAE Figure 3, ordered masked input, reconstruction, original: people and a bovine" />
  </div>
  <div class="ambiguity-explanation"><InfoBlock title="Multiple possible completions">Visible context does not determine every hidden detail.</InfoBlock><div v-if="$clicks >= 1" class="ssl-caption">The outputs differ from the originals while retaining plausible scene structure.</div><div v-if="$clicks >= 1" class="small-note">Visual plausibility alone does not establish semantic understanding or robot-task accuracy.</div></div>
</div>

<SSLControls />

<div class="citation"><a href="https://arxiv.org/html/2111.06377v3">He et al., MAE, CVPR 2022 · Fig. 3, two right-most examples · arXiv v3</a> · COCO validation images; model pretrained on ImageNet</div>



---
storyboard: S37
class: ssl-slide
clicks: 1
---

# What does a prediction target preserve?

<PredictionDemand :stage="$clicks" />



---
storyboard: S38
class: ssl-slide
clicks: 2
---

# JEPA: Predicting in feature space

<FeaturePrediction mode="features" :stage="$clicks" />

<div class="takeaway">Compute the target in the intermediate feature space.
No decoding into the output space (e.g., an image) is required.
This supports learning more abstract concepts and more efficient training at scale.</div>



---
storyboard: S39
class: ssl-slide
clicks: 2
---

# JEPA: Context and target positions

<FeaturePrediction mode="positions" :stage="$clicks" />



---
storyboard: S40
class: ssl-slide
clicks: 3
---

# JEPA: Feature loss and target updates

<FeaturePrediction mode="updates" :stage="$clicks" />



---
storyboard: S41
class: ssl-slide
clicks: 2
---

# I-JEPA architecture

<PredictiveArchitecture :stage="$clicks" />



---
storyboard: S42
class: ssl-slide
clicks: 2
---

# Pixel targets and feature targets

<PredictionSummary :stage="$clicks" />


