# Monana — User Flows

## WhatsApp User
```
Hi → Login/Register → Menu → Order → Pay → Confirm → Delivery updates
```

1. **Hi** — mtumiaji anatuma salamu, bot inajibu welcome + menyu.
2. **Login/Register** — kwa namba ya simu (auto via WhatsApp number).
3. **Menu** — chagua Chakula au Soko.
4. **Order** — chagua bidhaa + idadi, weka anwani.
5. **Pay** — Lipa Namba (manual MVP) — tuma reference.
6. **Confirm** — admin anathibitisha malipo.
7. **Delivery updates** — bot inatuma status (PREPARING → ON_THE_WAY → DELIVERED).

## Web User
```
Login → Dashboard → Food/Market → Checkout → Pay → Track order
```

1. **Login** — namba ya simu / akaunti.
2. **Dashboard** — muhtasari wa akaunti.
3. **Food/Market** — vinjari bidhaa, ongeza kwenye cart.
4. **Checkout** — thibitisha cart + anwani.
5. **Pay** — Lipa Namba / QR (MVP).
6. **Track order** — fuatilia hali ya oda.

## Order status lifecycle
```
PENDING → CONFIRMED → PREPARING → ON_THE_WAY → DELIVERED
                                            └→ CANCELLED
```

## Payment status lifecycle
```
PENDING → AWAITING_CONFIRMATION → PAID
                               └→ FAILED → (REFUNDED)
```
