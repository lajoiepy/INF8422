---
storyboard: S02
section: Definition and learning mechanics
clicks: 3
---

# Supervision available to a robot

<SupervisionSignals :stage="$clicks" />

<InfoBlock title="The target needs a construction rule">

Recorded data can supply a training signal when we define a valid relationship between observations.

</InfoBlock>



---
storyboard: S03
clicks: 1
---

# Definition of self-supervised learning

<div class="definition">Self-supervised learning trains a model using supervisory signals derived automatically from the data itself, without requiring manually annotated labels for that learning stage.</div>

<TargetOrigin mode="definition" :stage="$clicks" />

<div class="takeaway">The origin of the training target determines the supervision setting.</div>



---
storyboard: S04
clicks: 2
---

# Supervised, self-supervised, and semi-supervised learning

<TargetOrigin mode="settings" :stage="$clicks" />

<InfoBlock title="The loss (cost) function alone does not identify the setting">

Squared error and cross-entropy can compare predictions to either manual or automatic targets.

</InfoBlock>



---
storyboard: S05
clicks: 2
---

# Pretext tasks and automatic targets

<TargetOrigin mode="examples" :stage="$clicks" />

<div class="small-note intro-note">A pretext task builds a representation through prediction or matching.</div>



---
storyboard: S06
clicks: 1
---

# Pretraining and optional fine-tuning

<LearningRoutes mode="pretraining" :stage="$clicks" />

<ExampleBlock title="Two adaptation choices">

Keep the encoder fixed and train a task head, or fine-tune the encoder together with the head.

</ExampleBlock>



---
storyboard: S07
clicks: 2
---

# Direct learning from measured outcomes

<LearningRoutes mode="direct" :stage="$clicks" />




---
storyboard: S08
clicks: 3
---

# Masking: Input, prediction, and target

<TrainingStep :stage="$clicks" />

<div class="small-note intro-note">i identifies an observation · Θ contains the encoder and decoder parameters · M selects hidden locations</div>



---
storyboard: S09
clicks: 3
class: training-update-slide
---

# Masking: Loss and parameter update

<TrainingStep :stage="4+$clicks" numerical />



---
storyboard: S10
---

# Masking: What remains after training

<TrainingStep :stage="8" retained />

<LearningRoutes mode="deployment" />

<div class="takeaway">Evaluate the retained representation on the intended perception task.</div>


