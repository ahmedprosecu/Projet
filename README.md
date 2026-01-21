# VIGISAFE (démo)

## Lancer l'application

```bash
python app.py
```

Ouvrez ensuite `http://localhost:5000`.

## Envoi d'email (alerte homme mort)

Définissez les variables d'environnement suivantes pour activer l'envoi SMTP :

- `VIGISAFE_SMTP_HOST`
- `VIGISAFE_SMTP_PORT` (par défaut 587)
- `VIGISAFE_SMTP_USER`
- `VIGISAFE_SMTP_PASS`
- `VIGISAFE_SMTP_FROM`
- `VIGISAFE_SMTP_TO`
