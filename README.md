# Projet mariage V2 — Alexandra & Anthony

Projet reconstruit de zéro, sans vidéo.

## Parcours
1. Enveloppe
2. Galerie
3. Faire-part + RSVP
4. Confirmation

## Supabase
1. Exécuter `schema.sql` dans Supabase > SQL Editor.
2. Créer le ou les utilisateurs du dashboard dans Authentication > Users.
3. Compléter `config.js` avec `supabaseUrl` et la clé `anon` de votre projet actuel.

## Photos à copier depuis l'ancien projet
- `assets/alexandra-anthony-envelope.jpeg`
- `assets/gallery/alexandra-anthony-horizontal.webp`
- `assets/gallery/alexandra-anthony-vertical.webp`

## Liens personnalisés
Créer une ligne dans `invitations` avec :
- `invitation_name`
- `invited_people`
- `max_guests`

Le token est généré automatiquement.
Lien invité : `https://VOTRE-SITE.netlify.app/?token=TOKEN`

## Dashboard
Accessible via `/dashboard.html`.
Seuls les utilisateurs Supabase Auth connectés peuvent lire les réponses grâce à la policy RLS.

## Important
Ne recopiez aucun ancien script de diagnostic ni ancien `app.js` dans ce projet.
