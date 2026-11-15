# Railway Management Backend

This is a light-weight project written on `Express.js` platform, a node library allowing for rapid backend development.

## How To Run?

To run this project, you need to have node package manager (npm) installed. Once you get this on your local machine, running the project is easy.

For a first run, you need to first download the `node_modules` dependency as follows:

```bash
npm install
```

You also need to have local credentials setup. For this, first create a local `.env` in the same area as the given `.env.example` (project root) and copy the same. The following content(s) need to be supplied by you for server to start:

```text
MONGODB_URL = the URL for the MongoDB cluster
JWT_SECRET  = the JWT secret used by encryption of passwords
```

Once it downloads everything, the server can be started by using the command:

```bash
npm run dev
```

This will run the server in local in DEV. By default, it points to the port `5001` but this can be changed from the `.env`.
