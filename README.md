# NetOS - Serveur Web Personnel Tout-en-un

NetOS est un serveur personnel puissant et modulaire conçu pour fonctionner comme un OS entièrement connecté dans un navigateur. Il permet à un utilisateur de lancer, gérer et interagir avec une variété d'applications web, de communiquer en temps réel, de gérer ses fichiers, ses objets connectés, et bien plus encore.

---

## ✨ Fonctionnalités principales

### 🚪 Authentification & Session
- Page de login avec sessions stockées en MongoDB
- Middleware Express vérifiant l'accès aux routes REST
- Prise en charge de plusieurs apps ouvertes pour un même utilisateur

### 🚀 Lancement d'applications web
- Chargement d'apps dans des iframes, chaque app a son propre onglet
- L'onglet "Home" liste les apps favorites
- Ajout simple d'applications via `front/src/webapps/<appName>`

### 📂 Stockage de fichiers personnel
- App `folder` pour explorer, créer, supprimer, organiser ses fichiers
- Écriture possible uniquement dans `/app/<appName>` pour chaque app
- Lecture autorisée sur tout l'espace perso
- Partage de fichiers via `/share`, avec autorisation contrôlée par l'app `friends`

### ⏱ Temps réel via WebSocket
- WebSocket global pour notifications et alertes
- WebSocket par app pour communication front/back en temps réel
- Transmission d'un ID de session pour lier les requêtes aux connexions temps réel

### 🎧 Multimédia
- **Music** : gestion des MP3, tags ID3, playlists, contrôle via montre connectée
- **Mix DJ** : 2 decks, crossfader, égaliseur, spectre audio, contrôle MIDI
- **Phone** : appels audio/vidéo WebRTC entre utilisateurs connectés
- **Skill Alexa** : intégration avec Alexa pour jouer de la musique stockée sur NetOS

### 📏 Localisation & réseaux sociaux
- **Map** : affichage Leaflet des amis connectés en temps réel
- **Friends** : gestion des amis et des droits de partage (fichiers, position)

### 🛋️ Objets connectés & domotique
- **Homebox** : code déployable sur un Raspberry Pi ou PC utilisateur
- Connexion au serveur pour contrôle de prises/ampoules connectées

### 🤖 Interaction périphériques
- **Lego Technic** : programmation visuelle (Blockly) + Web Bluetooth pour contrôle de hubs Lego
- Prise en charge des manettes de jeu pour interactions avec certaines apps

### ✨ Divers
- **AGC Simulator** : simulateur WebAssembly de l'Apollo Guidance Computer
- Architecture modulaire (backend Express + frontend AngularJS-like fait maison)

---

## 🔧 Architecture technique

- **Backend** : Node.js + Express + MongoDB
- **Base de données** : 1 collection par application, filtrage automatique par utilisateur
- **Frontend** : framework perso type AngularJS + jQuery UI pour les onglets
- **WebSocket** : communication globale + WebSocket spécifique par app
- **Sécurité** : contrôle d'accès REST, isolation des données, sessions MongoDB

---

## 📄 Démarrage rapide (dev)

1. Cloner les repos : `breizbot-homebox`, `breizbot-server` (obsolète), `brainjs`
2. Configurer `config.js` avec l'URL MongoDB
3. Lancer le serveur : `node bak/server.js`
4. Ajouter une app dans `front/src/webapps/<appName>` + backend `index.js`

---

## 🔗 Repositories principaux

- 🔗 Serveur principal : [github.com/skynet29/breizbot](https://github.com/skynet29/breizbot)
- 🎨 Framework frontend : [github.com/skynet29/brainjs](https://github.com/skynet29/brainjs)

---

## 🧱 Vision
**NetOS** est une plateforme personnelle, modulaire, temps réel, ouverte, qui exploite toute la puissance des navigateurs modernes pour proposer un environnement OS complet dans le web.

---

> ✨ *Une seule page, une infinité de possibilités.*

