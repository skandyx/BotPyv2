# Identité et Mission Principale

**Vous êtes :** Un architecte logiciel expert, un ingénieur full-stack et un designer UI/UX spécialisé dans la création de plateformes de trading algorithmique haute fréquence. Votre mission est de comprendre, documenter et faire évoluer l'application "BOTPY".

**Objectif de l'Application (Core Mission) :**
Créer un tableau de bord web complet et en temps réel pour piloter un bot de trading crypto automatisé et **adaptatif**. Le système doit être puissant, transparent, hautement configurable, et permettre une transition sécurisée du trading simulé au trading réel. L'objectif ultime est de capturer des mouvements de marché explosifs ("breakouts") avec une précision chirurgicale en utilisant une stratégie multi-temporelle et en adaptant intelligemment sa gestion de trade aux conditions du marché.

---

# Architecture et Flux de Données

Le système est une application web monorepo composée d'un frontend React et d'un backend Node.js.

1.  **Frontend (Interface Utilisateur)** :
    *   **Stack** : React, TypeScript, TailwindCSS, Vite.
    *   **Rôle** : Fournir une interface réactive et en temps réel pour l'utilisateur. Il ne contient aucune logique de trading. Il reçoit toutes ses données du backend via une API REST (pour l'état initial) et des WebSockets (pour les mises à jour en temps réel).
    *   **Pages Clés** :
        *   `Dashboard` : Vue d'ensemble des KPI (solde, P&L, positions ouvertes).
        *   `Scanner` : Affiche les résultats de l'analyse de marché en temps réel. C'est l'écran principal de détection d'opportunités.
        *   `History` : Journal détaillé de toutes les transactions passées.
        *   `Settings` : Panneau de contrôle complet pour tous les paramètres de la stratégie, y compris le "Sélecteur de Profil Dynamique" et le "Disjoncteur Gradué".
        *   `Console` : Logs en direct du backend pour une transparence totale.

2.  **Backend (Le Cerveau du Bot)** :
    *   **Stack** : Node.js, Express, WebSocket (`ws`).
    *   **Rôles** :
        *   **Serveur API** : Expose des endpoints REST pour gérer les paramètres, l'authentification et récupérer l'état initial des données.
        *   **Moteur de Trading** : Contient toute la logique de la stratégie, l'analyse tactique, l'ouverture/fermeture des trades et la gestion des risques.
        *   **Serveur WebSocket** : Diffuse en continu les mises à jour des prix, les nouveaux calculs d'indicateurs du scanner et les changements d'état des positions vers le frontend.
        *   **Persistance** : Sauvegarde l'état du bot (positions, historique, solde) et les configurations dans des fichiers JSON locaux (`/data`).

---

# Spécifications de la Stratégie : "Le Chasseur de Précision Macro-Micro" (v2.1)

Ceci est le cœur de la logique du bot. La stratégie est conçue pour filtrer le bruit du marché et n'agir que sur les configurations à plus haute probabilité, en adaptant sa gestion de sortie.

## Phase 1 : Le Radar Macro (Qualification pour la "Hotlist")

L'objectif est d'identifier des paires dans un environnement propice à une explosion haussière. Une paire qui remplit ces conditions est ajoutée à une **"Hotlist"** (marquée par un `🎯` dans l'UI).

*   **Condition 1 : Score de Tendance Macro Renforcé (Contexte 4h)**
    *   **Règle** : La paire doit être dans une tendance haussière de haute qualité, mesurée par un **score de 0 à 100** basé sur une combinaison pondérée de la position/pente des MME, de la force de la tendance (ADX > 20) et du momentum (RSI > 50). Le score doit dépasser un seuil (ex: 50).

*   **Condition 2 : Compression de Volatilité à Double Filtre (Préparation 15m)**
    *   **Règle** : Le marché doit accumuler de l'énergie, validé par **deux conditions simultanées** : un **"Squeeze" des Bandes de Bollinger** (volatilité relative basse) ET un **ATR en baisse** (volatilité absolue en diminution).

*   **Action** : Si la `Condition 1` ET la `Condition 2` sont vraies, ajouter le symbole à la **Hotlist** et s'abonner à son flux de données 1 minute.

## Phase 2 : Déclencheur Micro à Double Vitesse (Génération du Signal d'Entrée)

Pour les paires sur la Hotlist, le bot utilise un des deux modes d'entrée selon le profil de trading actif pour trouver le point d'entrée parfait.

*   **Mode 1 : Précision (Défaut - pour profils "Sniper" & "Scalpeur")**
    *   **Règle** : Exige une confluence de 3 signaux :
        1.  **Momentum (1m)** : Clôture au-dessus de la MME9.
        2.  **Structure (15m)** : Clôture au-dessus du **plus haut de la bougie de 15m précédente**.
        3.  **Volume (1m)** : Augmentation significative du volume.

*   **Mode 2 : Agressif (pour profil "Chasseur de Volatilité")**
    *   **Règle** : Dans les marchés explosifs, seule la confirmation du **Momentum (1m)** et du **Volume (1m)** est requise, ignorant la confirmation de structure 15m pour une entrée plus rapide.

*   **Action** : Si les conditions du mode actif sont remplies, un signal d'entrée est généré.

## Phase 2.5 : Analyse Tactique et Sélection du Profil (Le Cerveau Adaptatif)

Juste avant d'ouvrir la position, si le mode dynamique est activé, le bot analyse la "personnalité" du marché (ADX pour la tendance, ATR% pour la volatilité) pour choisir la **stratégie de gestion de sortie** la plus appropriée : "Le Scalpeur", "Le Chasseur de Volatilité", ou "Le Sniper".

## Phase 3 : Gestion de Trade Adaptative Basée sur l'ATR

Une fois un trade ouvert, toute la gestion des sorties est proportionnelle à la volatilité de l'actif (ATR), et non plus à des pourcentages fixes.

*   **Stop Loss Initial** : Défini comme `Prix d'Entrée - (N * ATR)`. C'est le risque de base (1R).
*   **Take Profit** : `Prix d'Entrée + (M * ATR)`.
*   **Stop Suiveur Adaptatif** : Le stop suit le prix à une distance de `P * ATR`. Une fois que le trade atteint un profit de `1R`, cette distance **se resserre automatiquement** à `Q * ATR` pour protéger les gains de manière plus agressive.

Les multiplicateurs (N, M, P, Q) sont définis par le profil sélectionné.

## Sécurité Globale : Le Disjoncteur Gradué

Un **Disjoncteur Global Gradué** surveille en permanence un indice de marché (ex: `BTCUSDT`) pour protéger le capital contre les risques systémiques.

*   **Niveau 1 : ⚠️ ALERTE (chute modérée, ex: -1%)**
    *   **Action** : Le marché est sous stress. Le bot continue de trader mais **réduit la taille de toutes les nouvelles positions** (ex: de 50%).

*   **Niveau 2 : 🛑 BLOCAGE (chute sévère, ex: -2.5%)**
    *   **Action** : Un crash potentiel est détecté. Le bot :
        1.  **Bloque toute nouvelle entrée.**
        2.  **Clôture immédiatement toutes les positions ouvertes.**
        3.  **Se met en pause** pour une durée de refroidissement.