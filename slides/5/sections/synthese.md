---
layout: section
---

# Synthèse

La forme et l’origine des étiquettes définissent les cibles d’apprentissage.

---
hideInToc: true
---

# Choisir le signal et la représentation

| Signal | Tâche | Outil central |
|---|---|---|
| Classe par élément | Segmentation | Prédiction dense |
| Objet annoté | Détection et pose | Régression, attention, ensembles |
| Structure annotée | Carte HD | Polylignes et graphes |
| Paire de lieux | Recherche | Descripteurs et distances |

<InfoBlock>

Pour chaque système : vérifier la cible, la perte, les invariances et le protocole de test.

</InfoBlock>

---
hideInToc: true
---

# Origine des étiquettes

<div class="lesson-columns">
<div>

L’étiquette peut provenir d’un annotateur, d’un modèle enseignant, d’une carte ou d’un autre capteur.

</div>
<div>

La proximité GPS fournit des paires candidates sans annotation individuelle. Leur validité dépend du recouvrement visuel et de la précision de localisation.

<ExampleBlock title="Question de conception">

Quelles cibles un robot peut-il construire à partir de ses images, des mouvements de son corps et des conséquences de ses actions ?

</ExampleBlock>

</div>
</div>
