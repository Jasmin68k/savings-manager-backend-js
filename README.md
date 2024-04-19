# Savings Manager

Savings Manager is a straightforward app for organizing savings. With its intuitive interface, you can create virtual envelopes for different savings objectives, deposit and withdraw funds easily, and transfer money between envelopes seamlessly. Set up automated savings distribution cycles to streamline your progress towards financial goals.

Check it out at the link below using its frontend available at https://github.com/Jasmin68k/savings-manager-frontend:

https://savings-manager.siliconmoon.com/

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

## History

The project began with the creation of a frontend (see above) designed to complement the Python backend, inspired by its UI mockups, available at https://github.com/PythBuster/savings_manager. This backend has also been preserved at https://github.com/Jasmin68k/savings-manager-backend.

To fully implement all features initially envisioned by the original backend's author, the backend was first reimplemented, then extended upon using NodeJS/Express. This included the completion of all proposed features. The frontend was developed concurrently to ensure seamless integration with the new NodeJS/Express backend, thus meeting the initial project specifications.

A version of this backend which is not feature-complete yet remains fully API-compatible with the original Python backend is available in the `compatibility/python-backend` branch. The feature-complete version of the project is available in the `master` branch.
