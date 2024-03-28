# Savings Manager Backend

NodeJS/Express implementation (work in progress) of this backend:

https://github.com/PythBuster/savings_manager

Backend also forked here:

https://github.com/Jasmin68k/savings-manager-backend

Check it out here (auto-deployed `feature/temp-express-only` branch):

https://savings-manager-frontend.netlify.app/ (using this frontend: https://github.com/Jasmin68k/savings-manager-frontend)

## Configuration

Setup MongoDB.

Create `.env.local` in root directory with the following entries:

- `DB_USER=[USERNAME]`
- `DB_PASSWORD=[PASSWORD]`
- `DB_CLUSTER=[CLUSTER]`
- `DB_APPNAME=[APPNAME]`
- `PORT=[SERVERPORT]`

## Project setup

```
npm install
```

### Start server

```
npm run start
```
