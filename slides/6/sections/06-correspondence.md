---
storyboard: S57
section: Correspondances dans l’espace et le temps
class: ssl-slide
clicks: 2
---

# Le temps comme source d’observations liées

<TimeRelations :stage="$clicks" />



---
storyboard: S58
class: ssl-slide
clicks: 2
---

# Time-Contrastive Networks

<TCNPaper :stage="$clicks" />



---
storyboard: S59
class: ssl-slide
clicks: 2
---

# Correspondances de pixels construites par géométrie

<CorrespondenceLab mode="pairs" :stage="$clicks" />



---
storyboard: S60
class: ssl-slide
clicks: 2
---

# Apprendre des descripteurs denses

<DescriptorTraining :stage="$clicks" />



---
storyboard: S61
class: ssl-slide
clicks: 2
---

# Apparier avec des descripteurs appris

<CorrespondenceLab mode="search" :stage="$clicks" />



---
storyboard: S62
class: ssl-slide
clicks: 2
---

# Cohérence des descripteurs entre configurations

<div class="descriptor-paper-label">Observations RVB en haut · couleurs des descripteurs denses en bas</div>
<div class="descriptor-consistency-paper"><img src="../images/don-deformation.png" alt="Dense Object Nets figure 2(a) originale : cinq images RVB et descripteurs d’une chenille déformable"/><svg v-if="$clicks>=1" viewBox="0 0 1263 384" aria-hidden="true"><g fill="none" stroke="white" stroke-width="8"><circle cx="140" cy="310" r="23"/><circle cx="360" cy="305" r="23"/><circle cx="550" cy="240" r="23"/></g><g fill="none" stroke="#168034" stroke-width="4"><circle cx="140" cy="310" r="23"/><circle cx="360" cy="305" r="23"/><circle cx="550" cy="240" r="23"/></g></svg></div>

<div class="ssl-caption">L’objet change de configuration; les régions correspondantes gardent des couleurs similaires.</div>

<div v-if="$clicks>=2" class="takeaway">Les couleurs codent des descripteurs, sans étiquettes manuelles de parties sémantiques.</div>

<SSLControls />

<div class="citation"><a href="https://arxiv.org/pdf/1806.08756v2">Florence et al., Dense Object Nets, CoRL 2018 · Fig. 2(a), les cinq configurations · arXiv v2</a></div>



---
storyboard: S63
class: ssl-slide
clicks: 2
---

# Transférer un point de prise

<TaskPointTransfer :stage="$clicks" />



---
storyboard: S64
class: ssl-slide
clicks: 2
---

# Extension aux correspondances 3D

<PointCloudCorrespondence :stage="$clicks" />


