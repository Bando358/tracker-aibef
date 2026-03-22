# Guide du Dashboard TRACKER-AIBEF

## Presentation generale

Le dashboard est la page d'accueil apres connexion. Il offre une vue d'ensemble de l'activite de l'organisation, adaptee au role de chaque utilisateur. Les donnees sont chargees en temps reel a chaque visite.

---

## Message d'accueil

En haut de page, un bandeau affiche un message personnalise :
- **"Bonjour"** (avant 12h), **"Bon apres-midi"** (12h-18h), ou **"Bonsoir"** (apres 18h)
- Suivi du nom de l'utilisateur connecte
- Le titre change selon le profil :
  - Super Administrateur : "Dashboard National"
  - Responsable d'antenne : "Dashboard Antenne" + nom de l'antenne
  - Soignant / Administratif : "Mon Espace"

---

## Cartes indicateurs (KPIs)

Deux rangees de 4 cartes affichent les indicateurs cles.

### Premiere rangee — Activites et recommandations

| Indicateur | Ce qu'il affiche |
|---|---|
| **Total activites** | Nombre total d'activites + nombre de realisees. Carte mise en avant avec fond colore. |
| **Taux de realisation** | Pourcentage d'activites realisees par rapport au total. Une fleche verte ou rouge indique si le taux est bon (>= 50%) ou insuffisant. |
| **Recommandations** | Nombre total de recommandations + nombre de resolues. |
| **Taux de resolution** | Pourcentage de recommandations resolues. Meme systeme de fleche que le taux de realisation. |

### Deuxieme rangee — Alertes et suivi RH

| Indicateur | Ce qu'il affiche |
|---|---|
| **Activites en retard** | Nombre d'activites en depassement de delai. La carte devient rouge si le nombre est superieur a 0. |
| **Retards ce mois** | Nombre de pointages en retard ce mois + total de minutes cumulees. La carte devient orange si le nombre est superieur a 0. |
| **Absences ce mois** | Nombre de jours d'absence ce mois. Pour les managers, affiche aussi le nombre d'employes concernes. La carte devient rouge si le nombre est superieur a 0. |
| **Conges en attente** | Nombre de demandes de conge en attente de validation. La carte devient orange si le nombre est superieur a 0. |

---

## Mon pointage de la semaine (employes uniquement)

Cette section n'apparait que pour les profils Soignant et Administratif. Elle resume le pointage de la semaine en cours sous forme de 4 compteurs :

| Compteur | Couleur | Signification |
|---|---|---|
| Present | Vert | Nombre de jours pointes comme present |
| Absent | Rouge | Nombre de jours marques absent |
| Retard | Orange | Nombre de jours avec retard |
| Conge | Bleu | Nombre de jours en conge |

---

## Vue detaillee — 3 onglets

La partie basse du dashboard est organisee en 3 onglets. Chaque onglet affiche dans son en-tete un resume rapide (compteur, barre de progression ou mini-statistiques) pour voir l'essentiel sans meme cliquer.

### Onglet "Activites"

**En-tete de l'onglet :** nombre total d'activites, barre de progression du taux de realisation, nombre de realisees et pourcentage.

**Contenu :**

- **Graphique en barres "Activites par statut"** : une barre par statut (Planifiee, En cours, Realisee, En retard, Annulee, Reprogrammee). Chaque statut a sa propre couleur. Le nombre est affiche au-dessus de chaque barre.

- **Graphique en anneau "Recommandations par statut"** : repartition des recommandations (En attente, En cours, Partiellement realisee, Resolue, En retard, Annulee). Une legende a droite associe chaque couleur au statut avec son nombre.

- **Graphique en courbe "Evolution mensuelle"** : courbe montrant le nombre d'activites creees mois par mois sur les 12 derniers mois. L'aire sous la courbe est coloree en degrade.

- **Graphique en barres horizontales "Performance par antenne"** (Super Administrateur uniquement) : une barre par antenne montrant le nombre d'activites assignees.

- **Liste "Activites recentes"** : les 5 dernieres activites avec leur titre, projet associe, badge de statut et date de fin. Un lien "Tout voir" redirige vers la page complete des activites.

- **Liste "Recommandations en retard"** : les 5 recommandations les plus urgentes en retard, avec titre, antenne, badge de priorite (Haute en rouge, Moyenne en orange, Basse en vert) et date d'echeance. Un lien "Tout voir" redirige vers la page des recommandations.

---

### Onglet "Conges"

**En-tete de l'onglet :** si des demandes sont en attente, un badge rouge anime apparait avec le nombre. Sinon, le nombre de conges approuves s'affiche. Trois pastilles colorees resument : approuves (vert), en attente (orange), refuses (rouge).

**Contenu :**

- **4 cartes indicateurs :**
  - En attente : nombre de demandes a traiter (orange si > 0)
  - Approuves : nombre de conges approuves cette annee (vert)
  - Refuses : nombre de conges refuses cette annee (rouge si > 0)
  - Jours utilises : total de jours de conge pris cette annee

- **Graphique en anneau "Conges par type"** : repartition des conges approuves par type (Annuel, Maladie, Maternite, Paternite, Exceptionnel, Sans solde). Legende a droite avec les nombres.

- **Liste "Dernieres demandes"** : les 5 dernieres demandes de conge. Pour les managers : nom de l'employe, type de conge, duree et dates. Pour les employes : type de conge, duree et dates. Chaque ligne affiche un badge de statut (Brouillon, Soumis, Approuve, Refuse...). Un lien "Tout voir" redirige vers la page des conges.

---

### Onglet "Retards"

**En-tete de l'onglet :** nombre total de retards ce mois (en orange si > 0, en vert si 0). Deux mini-indicateurs : total de minutes cumulees et nombre d'absences.

**Contenu :**

- **4 cartes indicateurs :**
  - Retards ce mois : nombre de pointages en retard
  - Minutes cumulees : total de minutes de retard ce mois (rouge si > 30 min)
  - Absences ce mois : nombre de jours marques absent (rouge si > 0)
  - Employes concernes (managers) / Recommandations en retard (employes)

- **Graphique en barres "Retards par jour"** : une barre par jour ouvrable (Lundi a Vendredi) montrant le nombre de retards ce mois. Permet d'identifier les jours problematiques.

- **Liste "Derniers retards"** : les 8 derniers retards enregistres. Pour les managers : nom de l'employe, date, antenne et minutes de retard. Pour les employes : date et minutes de retard. Chaque ligne affiche un badge orange avec le nombre de minutes. Un lien "Tout voir" redirige vers la page des pointages.

---

## Ce que voit chaque profil

| Element | Super Admin | Responsable Antenne | Soignant / Administratif |
|---|---|---|---|
| Cartes KPIs | Toutes les antennes | Son antenne uniquement | Ses propres donnees |
| Pointage semaine | Non | Non | Oui |
| Graphique par antenne | Oui | Non | Non |
| Activites recentes | Toutes | Celles de son antenne | Celles qui lui sont assignees |
| Recommandations | Toutes | Celles de son antenne | Celles ou il est responsable |
| Conges | Toutes les demandes | Employes de son antenne | Ses propres demandes |
| Retards | Tous les employes | Employes de son antenne | Ses propres retards |

---

## Themes

Le dashboard s'adapte au theme choisi par l'utilisateur (accessible via le bouton en haut a droite) :
- **Clair** : fond blanc, textes sombres
- **Sombre** : fond fonce, textes clairs
- **Bleu Institutionnel** : palette bleue professionnelle
- **Vert AIBEF** : palette verte aux couleurs de l'AIBEF

Le theme choisi est sauvegarde et restaure automatiquement a chaque connexion.
