# Plan d'Architecture Temps Réel & Synchronisation Multi-Onglets (Khademni ATS)

## 1. Architecture Actuelle & Flux de Synchronisation

### État des Lieux
1. **Modèle de Requêtes Actuel** :
   - Le frontend utilise `@tanstack/react-query` avec un `staleTime` global de 60 secondes et `refetchOnWindowFocus: false`.
   - Les données ne sont rafraîchies que lors d'un rechargement manuel de page ou lors d'une mutation explicite dans le même onglet.
2. **Gestion des Notifications** :
   - Le composant `Header.tsx` interroge `/api/v1/notifications/unread-count` une seule fois au montage.
   - Les notifications générées côté backend (changement de statut de candidature, invitation à un entretien) ne sont pas poussées au client en temps réel.
3. **Moteur de Matching IA Asynchrone** :
   - `BullMQ` exécute les calculs de matching sur Redis en tâche de fond (`matching-queue.service.ts`), mais la progression (pourcentage, nombre de CV traités) n'est pas diffusée en streaming vers l'interface d'administration.
4. **Multi-Onglets & Multi-Utilisateurs** :
   - Aucune synchronisation inter-onglets (`BroadcastChannel` ou `storage events`).
   - Lorsqu'un utilisateur effectue une action dans un onglet A, l'onglet B conserve des données périmées.

---

## 2. Goulots d'Étranglement & Problèmes Détectés

| Module | Comportement Actuel | Impact Utilisateur |
|---|---|---|
| **Notifications** | Requête unique au montage | Notification manquée jusqu'au rafraîchissement manuel |
| **Candidatures** | Mutation locale isolée | Le candidat ne voit pas le changement de statut en direct |
| **Entretiens** | Polling statique | Les recuteurs et candidats doivent recharger la page |
| **Matching IA** | Calcul en tâche de fond aveugle | L'admin ignore l'état d'avancement du batch de matching |
| **Multi-Onglets** | Cache React Query local par onglet | Incohérence des compteurs et des statuts entre onglets |

---

## 3. Architecture Temps Réel Cible (Zero-Trust & Haute Performance)

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            Frontend (Next.js 16)                                 │
│  ┌────────────────────────┐  ┌───────────────────────┐  ┌─────────────────────┐  │
│  │ RealtimeProvider (WS)  │  │ BroadcastChannel Sync │  │ TanStack Query Cache│  │
│  └───────────▲────────────┘  └───────────▲───────────┘  └──────────▲──────────┘  │
└──────────────┼───────────────────────────┼─────────────────────────┼─────────────┘
               │ Secure WSS / JWT Handshake│ Inter-Tab Sync          │ Invalidate /
               │                           │                         │ Patch
┌──────────────▼───────────────────────────┴─────────────────────────▼─────────────┐
│                          Backend (Node.js / Express 5)                           │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ WebSocket Server (ws) + Zero-Trust RBAC Guard (JWT Token Validation)      │  │
│  └─────────────────────────────────────▲──────────────────────────────────────┘  │
│                                        │                                         │
│  ┌─────────────────────────────────────▼──────────────────────────────────────┐  │
│  │ Central RealtimeEventBus (Redis Pub/Sub Channel Engine)                   │  │
│  └─────────────────────────────────────▲──────────────────────────────────────┘  │
│                                        │                                         │
│  ┌──────────────────┐ ┌────────────────┴───┐ ┌──────────────────┐ ┌───────────┐  │
│  │ Applications Svc │ │  Interviews Svc    │ │ Notifications Svc│ │ BullMQ Wkr│  │
│  └──────────────────┘ └────────────────────┘ └──────────────────┘ └───────────┘  │
└────────────────────────────────────────┼─────────────────────────────────────────┘
                                         ▼
                   ┌───────────────────────────────────────────┐
                   │  Redis Pub/Sub Cluster (Upstash / Local)  │
                   └───────────────────────────────────────────┘
```

---

## 4. Stratégie WebSocket & Événements Backend

### A. Sécurisation & Isolation Multi-Tenant (Zero-Trust)
- **Handshake d'authentification** : Validation cryptographique du JWT `accessToken` lors de la connexion WebSocket.
- **Canaux / Salles isolées strictement** :
  1. `user:<userId>` : Événements personnels (notifications unitaires, convocations entretien).
  2. `tenant:<organizationId>` : Événements d'établissement (nouvelle candidature, progression matching IA, log d'audit).
  3. `public:jobs` : Offres d'emploi publiées / fermées.
- **Règles d'accès** :
  - Un utilisateur de rôle `CANDIDATE` ne peut jamais souscrire à un canal `tenant:*`.
  - Un utilisateur de rôle `ORGANIZATION_ADMIN` ne peut souscrire qu'à son propre `tenant:<organizationId>`.

### B. Taxonomie des Événements Typés
```typescript
export type RealtimeEventType =
  | "NOTIFICATION_CREATED"
  | "NOTIFICATION_READ"
  | "NOTIFICATIONS_READ_ALL"
  | "APPLICATION_CREATED"
  | "APPLICATION_STATUS_UPDATED"
  | "MATCHING_PROGRESS_UPDATED"
  | "MATCHING_RUN_COMPLETED"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEW_UPDATED"
  | "SCORECARD_SUBMITTED"
  | "JOB_STATUS_UPDATED";
```

---

## 5. Synchronisation Frontend & Stratégie de Cache TanStack Query

### A. Gestionnaires d'Événements dans le Client Temps Réel
1. **Sur `NOTIFICATION_CREATED`** :
   - Incrémentation atomique du cache `['notifications', 'unread-count']`.
   - Insertion optimiste dans la liste `['notifications']`.
   - Déclenchement d'un toast interactif via `sonner` avec redirection directe.
2. **Sur `APPLICATION_STATUS_UPDATED`** :
   - Invalidation ciblée des clés `['applications']`, `['applications', id]`, `['admin', 'stats']`, `['candidate', 'dashboard']`.
3. **Sur `MATCHING_PROGRESS_UPDATED`** :
   - Mise à jour en direct de la jauge de progression de l'algorithme de matching IA sur `/admin/matching` sans re-fetch réseau complet.
4. **Sur `INTERVIEW_SCHEDULED` / `SCORECARD_SUBMITTED`** :
   - Invalidation de `['interviews']` et rafraîchissement des grilles d'évaluation.

### B. Synchronisation Multi-Onglets (`BroadcastChannel API`)
- Création d'un canal `khademni_tab_sync` :
  - Synchronise la déconnexion globale si l'utilisateur se déconnecte d'un onglet.
  - Diffuse les invalidations de cache pour garder tous les onglets ouverts en parfaite synchronisation.

---

## 6. Résilience, Reconnexion & Tolérance aux Pannes

1. **Heartbeat Actif (Ping/Pong)** : Ping toutes les 25 secondes pour détecter immédiatement les pertes de signal.
2. **Reconnexion avec Backoff Exponentiel & Jitter** :
   - Intervalles : 1s, 2s, 4s, 8s, max 30s.
3. **Fallback Transparent** : En cas d'indisponibilité temporaire des WebSockets, TanStack React Query bascule sur un polling intelligent pour garantir la continuité de service.

---

## 7. Plan d'Implémentation Ordonné (Tâches & Dépendances)

### Phase 1 : Infrastructure Temps Réel Backend
- [ ] **Tâche 1.1** : Créer le gestionnaire WebSocket `backend/src/lib/realtime/websocket-server.ts` avec validation JWT et souscription Redis Pub/Sub.
- [ ] **Tâche 1.2** : Créer le bus d'événements `backend/src/lib/realtime/event-bus.ts` pour émettre des événements typés depuis les services.
- [ ] **Tâche 1.3** : Connecter le serveur WebSocket sur l'instance HTTP d'`index.ts`.
- [ ] **Tâche 1.4** : Intégrer l'émission d'événements dans `notifications.service.ts`, `applications.service.ts`, `interviews.service.ts`, et `matching-queue.service.ts`.

### Phase 2 : Client Temps Réel & Cache Frontend
- [ ] **Tâche 2.1** : Créer le hook et provider `frontend/src/lib/realtime/realtime-context.tsx`.
- [ ] **Tâche 2.2** : Connecter la synchronisation multi-onglets via `BroadcastChannel` dans `frontend/src/lib/realtime/tab-sync.ts`.
- [ ] **Tâche 2.3** : Brancher les invalidations et mises à jour optimistes de TanStack Query sur les événements WebSocket reçus.
- [ ] **Tâche 2.4** : Mettre à jour `Header.tsx`, `/notifications`, `/admin/matching`, `/admin/applications` et `/candidate/applications` pour réagir aux flux en direct.

### Phase 3 : Tests & Validation QA
- [ ] **Tâche 3.1** : Rédiger les tests unitaires et d'intégration du bus d'événements et de l'isolation des canaux tenant.
- [ ] **Tâche 3.2** : Valider la reconnexion automatique et l'absence de fuites mémoire.
- [ ] **Tâche 3.3** : Exécuter la suite complète de tests Vitest (93 tests) et la compilation Next.js (29 routes).

---

## 8. Plan de Vérification

### Tests Automatisés
- `backend` : `npx vitest run` (Validation de non-régression et tests du module temps réel).
- `frontend` : `npx tsc --noEmit && npm run build` (Validation de la compilation des 29 routes).

### Validation Manuelle
1. Ouvrir deux navigateurs (un Candidat, un Admin d'Établissement).
2. Déposer une candidature côté Candidat -> Vérifier l'apparition instantanée de la notification et de la nouvelle ligne dans le tableau Admin sans recharger.
3. Modifier le statut côté Admin -> Vérifier la mise à jour immédiate du badge et du statut côté Candidat.
4. Lancer un matching IA -> Vérifier le flux de progression en streaming.
