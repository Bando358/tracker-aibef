# Guide de configuration du lecteur d'empreinte digitale SecuGen

## Pre-requis materiel

- **Lecteur** : SecuGen Hamster Pro 20 (HU20) ou compatible SecuGen
- **PC** : Windows 10/11 avec port USB disponible
- **Navigateur** : Google Chrome ou Microsoft Edge (version recente)

---

## Etape 1 : Installer le driver SecuGen

1. Brancher le lecteur SecuGen sur un port USB du PC
2. Telecharger le driver depuis le site officiel SecuGen :
   - Aller sur [https://secugen.com/download](https://secugen.com/download)
   - Telecharger **FDx SDK Pro for Windows** (ou le driver correspondant a votre modele)
3. Installer le driver en suivant l'assistant d'installation
4. Verifier que le lecteur est reconnu :
   - Ouvrir le **Gestionnaire de peripheriques** Windows
   - Chercher sous **Peripheriques biometriques** ou **Peripheriques USB**
   - Le lecteur doit apparaitre sans point d'exclamation jaune

---

## Etape 2 : Installer SecuGen WebAPI

Le WebAPI est le service local qui permet au navigateur de communiquer avec le lecteur.

1. Telecharger **SecuGen Web Service API** depuis :
   - [https://secugen.com/download](https://secugen.com/download)
   - Section **WebAPI** ou **Web Service API**
2. Installer le service :
   - Executer l'installeur en tant qu'administrateur
   - Accepter les options par defaut
   - Le service s'installe et demarre automatiquement
3. Verifier que le service tourne :
   - Ouvrir un navigateur
   - Aller sur `https://localhost:8443`
   - Si une page de bienvenue SecuGen s'affiche (ou un message JSON), le service fonctionne

> **Note** : Le service SecuGen WebAPI demarre automatiquement avec Windows. Pas besoin de le relancer a chaque demarrage.

---

## Etape 3 : Accepter le certificat SSL auto-signe

Le WebAPI utilise HTTPS avec un certificat auto-signe. Le navigateur va le bloquer par defaut.

### Sur Google Chrome :

1. Ouvrir Chrome
2. Aller sur `https://localhost:8443`
3. Chrome affiche "Votre connexion n'est pas privee" (ou "Your connection is not private")
4. Cliquer sur **Parametres avances** (ou "Advanced")
5. Cliquer sur **Continuer vers localhost (dangereux)** (ou "Proceed to localhost (unsafe)")
6. La page SecuGen doit s'afficher — le certificat est maintenant accepte

### Sur Microsoft Edge :

1. Ouvrir Edge
2. Aller sur `https://localhost:8443`
3. Cliquer sur **Avance** puis **Continuer vers localhost**

> **Important** : Cette etape doit etre faite **une seule fois** par navigateur. Si vous changez de navigateur, refaites cette etape.

---

## Etape 4 : Configurer les variables d'environnement

Modifier le fichier `.env` du projet TRACKER-AIBEF :

```env
# Passer du mode mock au mode reel
NEXT_PUBLIC_FINGERPRINT_MOCK=false

# Cle de licence SecuGen (fournie avec votre licence)
NEXT_PUBLIC_SECUGEN_LICENSE="VOTRE-CLE-DE-LICENCE-SECUGEN"

# URL du service local (ne pas modifier sauf si vous avez change le port)
NEXT_PUBLIC_FINGERPRINT_SERVICE_URL=https://localhost:8443

# Cles API (garder les valeurs existantes ou en generer de nouvelles)
NEXT_PUBLIC_FINGERPRINT_API_KEY="tracker-aibef-fingerprint-key-2026"
FINGERPRINT_API_KEY="tracker-aibef-fingerprint-key-2026"

# Cle de chiffrement des templates (minimum 32 caracteres, NE PAS MODIFIER apres enrolement)
FINGERPRINT_ENCRYPTION_KEY="aibef-tracker-fp-encryption-key-32ch"
```

### Parametres importants :

| Variable                              | Valeur                   | Description                                              |
| ------------------------------------- | ------------------------ | -------------------------------------------------------- |
| `NEXT_PUBLIC_FINGERPRINT_MOCK`        | `false`                  | **Mettre a `false`** pour utiliser le vrai lecteur       |
| `NEXT_PUBLIC_SECUGEN_LICENSE`         | Votre cle                | Cle de licence fournie par SecuGen avec votre SDK        |
| `NEXT_PUBLIC_FINGERPRINT_SERVICE_URL` | `https://localhost:8443` | Adresse du service local SecuGen                         |
| `FINGERPRINT_ENCRYPTION_KEY`          | 32+ caracteres           | **NE JAMAIS MODIFIER** apres avoir enrole des empreintes |

> **ATTENTION** : Si vous changez `FINGERPRINT_ENCRYPTION_KEY` apres avoir enrole des empreintes, toutes les empreintes existantes deviennent inutilisables. Il faudra re-enroler tout le monde.

---

## Etape 5 : Redemarrer l'application

Apres avoir modifie le `.env` :

```bash
# Arreter le serveur (Ctrl+C si en cours)
# Puis relancer
npm run dev
```

Ou en production :

```bash
npm run build
npm run start
```

---

## Etape 6 : Verifier le bon fonctionnement

1. Ouvrir l'application dans le navigateur : `http://localhost:3000`
2. Se connecter avec un compte admin (ex: `admin` / `admin123`)
3. Aller dans **Parametres > Empreintes digitales**
4. En haut de la page, verifier le badge de statut du lecteur :
   - **Vert "Lecteur pret"** : Tout fonctionne, le lecteur est connecte et operationnel
   - **Gris "Lecteur deconnecte"** : Le lecteur n'est pas branche ou le driver n'est pas installe
   - **Rouge "Service indisponible"** : Le service SecuGen WebAPI ne tourne pas ou le certificat n'est pas accepte

### En cas de probleme :

| Statut | Cause probable              | Solution                  |
| ------ | --------------------------- | ------------------------- |
| Rouge  | Service WebAPI non installe | Refaire l'etape 2         |
| Rouge  | Certificat non accepte      | Refaire l'etape 3         |
| Gris   | Lecteur debranche           | Rebrancher le lecteur USB |
| Gris   | Driver manquant             | Refaire l'etape 1         |
| Gris   | Port USB defectueux         | Essayer un autre port USB |

---

## Etape 7 : Enroler les employes

L'enrolement doit etre fait par un **administrateur** (SUPER_ADMIN ou RESPONSABLE_ANTENNE).

### Processus d'enrolement :

1. Aller dans **Parametres > Empreintes digitales**
2. Dans la liste a gauche, cliquer sur l'employe a enroler
3. Selectionner le doigt a enregistrer (ex: "Index droit")
4. Effectuer **3 captures successives** :
   - Demander a l'employe de poser son doigt sur le lecteur
   - Cliquer sur **"Capturer l'empreinte"**
   - Attendre que la capture se termine (le lecteur clignote)
   - Retirer le doigt
   - Repeter 2 fois de plus (3 captures au total pour garantir la qualite)
5. Verifier que la qualite de chaque capture est suffisante (indicateur vert)
6. Cliquer sur **"Enregistrer l'empreinte"**
7. L'employe passe de "Non enrole" a "Enrole" dans la liste

### Conseils pour un bon enrolement :

- **Doigt propre et sec** : Essuyer le doigt avant la capture
- **Pression moderee** : Ne pas appuyer trop fort ni trop leger
- **Centrer le doigt** : Placer le centre du doigt au milieu du capteur
- **Ne pas bouger** : Garder le doigt immobile pendant la capture (2-3 secondes)
- **Enroler 2 doigts** : Il est recommande d'enroler au moins 2 doigts par employe (ex: index droit + index gauche) en cas de blessure a un doigt

### Doigts disponibles :

| Numero | Doigt              |
| ------ | ------------------ |
| 1      | Pouce droit        |
| 2      | Index droit        |
| 3      | Majeur droit       |
| 4      | Annulaire droit    |
| 5      | Auriculaire droit  |
| 6      | Pouce gauche       |
| 7      | Index gauche       |
| 8      | Majeur gauche      |
| 9      | Annulaire gauche   |
| 10     | Auriculaire gauche |

---

## Etape 8 : Utilisation quotidienne — Pointage

Une fois les employes enroles, le pointage se fait de maniere autonome :

### Pointer l'arrivee :

1. Ouvrir la page **Pointages** (`/pointages`) sur le PC de l'antenne
2. L'ecran affiche l'heure en temps reel et attend un scan
3. L'employe pose son doigt sur le lecteur
4. Le systeme identifie automatiquement l'employe (comparaison 1:N)
5. Le nom de l'employe s'affiche a l'ecran
6. Cliquer sur **"Pointer l'arrivee"**
7. Confirmation : "Arrivee enregistree a HH:MM"
8. L'ecran se reinitialise apres 5 secondes pour le prochain employe

### Pointer le depart :

- Meme processus, mais cliquer sur **"Pointer le depart"**

### Mode de secours (sans lecteur) :

Si le lecteur est en panne ou indisponible :

1. Sur la page de pointage, cliquer sur **"Pointage manuel (sans lecteur)"**
2. Le formulaire classique s'affiche
3. L'employe peut pointer manuellement (necessite d'etre connecte avec son compte)

---

## Configuration pour un deploiement en production (Vercel)

Quand l'application est hebergee en ligne (ex: Vercel) :

### Architecture :

```
[Lecteur USB] → [SecuGen WebAPI sur le PC local (localhost:8443)]
                        ↕ HTTPS (local)
              [Navigateur Chrome/Edge]
                        ↕ HTTPS (internet)
              [Serveur Vercel + Base Neon PostgreSQL]
```

- La **capture et la comparaison** des empreintes se font **localement** (entre le navigateur et le service SecuGen sur le meme PC)
- Le **stockage des templates** (chiffres) et les **enregistrements de pointage** transitent par internet vers le serveur

### Variables d'environnement sur Vercel :

Dans le dashboard Vercel > Settings > Environment Variables, ajouter :

```
FINGERPRINT_API_KEY=tracker-aibef-fingerprint-key-2026
FINGERPRINT_ENCRYPTION_KEY=aibef-tracker-fp-encryption-key-32ch
NEXT_PUBLIC_FINGERPRINT_MOCK=false
NEXT_PUBLIC_FINGERPRINT_SERVICE_URL=https://localhost:8443
NEXT_PUBLIC_FINGERPRINT_API_KEY=tracker-aibef-fingerprint-key-2026
NEXT_PUBLIC_SECUGEN_LICENSE=VOTRE-CLE-DE-LICENCE
```

> **Important** : `FINGERPRINT_ENCRYPTION_KEY` doit etre **identique** en local et sur Vercel. Si vous la changez, les empreintes ne pourront plus etre dechiffrees.

### Sur chaque PC de pointage :

1. Installer le driver SecuGen (etape 1)
2. Installer SecuGen WebAPI (etape 2)
3. Accepter le certificat SSL (etape 3)
4. Ouvrir le navigateur sur `https://votre-domaine.vercel.app`

Rien d'autre a installer sur le PC — le navigateur fait le reste.

---

## Resume des etapes

| #   | Etape                         | Temps estime        |
| --- | ----------------------------- | ------------------- |
| 1   | Installer driver SecuGen      | 5 min               |
| 2   | Installer SecuGen WebAPI      | 5 min               |
| 3   | Accepter certificat SSL       | 1 min               |
| 4   | Configurer .env (MOCK=false)  | 2 min               |
| 5   | Redemarrer l'application      | 1 min               |
| 6   | Verifier le statut du lecteur | 1 min               |
| 7   | Enroler les employes          | 2-3 min par employe |
| 8   | Utilisation quotidienne       | Automatique         |

---

## FAQ

**Q : Dois-je installer quelque chose sur chaque PC ?**
R : Oui, le driver SecuGen et le WebAPI doivent etre installes sur chaque PC ou un lecteur est branche. Mais l'application elle-meme est accessible via le navigateur.

**Q : Que se passe-t-il si le lecteur tombe en panne ?**
R : Un mode de secours "Pointage manuel" est toujours disponible. Les employes peuvent pointer manuellement en se connectant avec leur compte.

**Q : Puis-je utiliser plusieurs lecteurs sur differents PC ?**
R : Oui. Chaque PC de pointage doit avoir son propre lecteur et le WebAPI installe. Les empreintes sont stockees dans la base de donnees centrale, donc un employe enrole sur un PC peut pointer sur n'importe quel autre PC.

**Q : Comment re-enroler un employe ?**
R : Dans la page Empreintes digitales, selectionner l'employe, choisir le meme doigt, et refaire les 3 captures. L'ancienne empreinte sera automatiquement remplacee.

**Q : La cle de licence SecuGen est-elle obligatoire ?**
R : Pour l'utilisation en production, oui. En mode developpement/test, vous pouvez utiliser `NEXT_PUBLIC_FINGERPRINT_MOCK=true` pour simuler le lecteur sans materiel.

**Q : Les empreintes sont-elles securisees ?**
R : Oui. Les templates biometriques sont chiffres en AES-256-GCM avant d'etre stockes en base de donnees. Ils ne sont dechiffres que temporairement en memoire du navigateur pour la comparaison, puis supprimes.

claude mcp add gemini -s user -- env GEMINI_API_KEY=AIzaSyCfawA05d2GfAq54ab1Usm8EtEtzJUgvgs npx -y @rlabs-inc/gemini-mcp
