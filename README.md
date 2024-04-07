# Savings Manager Backend

NodeJS/Express implementation (work in progress) of this backend:

https://github.com/PythBuster/savings_manager

Backend also forked here:

https://github.com/Jasmin68k/savings-manager-backend

Check it out here (currently `feature/temp-express-only` branch):

https://savings-manager.siliconmoon.com/ (using this frontend: https://github.com/Jasmin68k/savings-manager-frontend)

## Configuration

Setup MongoDB with single-node replica set.

Create `.env.local` in root directory with the following entries:

- `DB_USER=[USERNAME]`
- `DB_PASSWORD=[PASSWORD]`
- `DB_NAME=[NAME]`
- `DB_APPNAME=[APPNAME]`
- `DB_HOST=[HOST]`
- `DB_PORT=[PORT]`
- `DB_RSNAME=[RSNAME]`
- `PORT=[SERVERPORT]`
- `CORS_ORIGIN=[CORS_ORIGIN]`

## Project setup

```
npm install
```

### Start server

```
npm run start
```
