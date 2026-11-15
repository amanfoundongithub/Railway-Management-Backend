# Python Scripts For Database

Due to limited time & resources, we have developed a Python script to populate the database by hitting on the server.

Feel free to add more stations & trains in the script.

## How To Run?

To run the script, follow the instructions from the root of the repository:

```bash
cd scripts
```

Make a virtual environment using the python command:

```bash
python -m venv .venv
```

Use this virtual environment, and install requirements:

```bash
pip install -r requirements.txt --no-user
```

Install dependencies, then run the code as follows:

```bash
python make_stations.py
python make_trains.py
```

This will run the code, and this will generate all the trains & stations.

## Notes on Getting JWT Token

This code requires you to put the JWT key for the admin account to start.

To generate a token, you need to go to perform the following request:

```bash
POST http://localhost:5001/api/auth/login
```

with the request body:

```json
{
  "email": "<email>",
  "password": "<password>"
}
```

You will get a response like this:

```json
{
    "status": "success",
    "token": "<jwt token>",
    "data": {
        "user": "<user details"
    }
}
```

Copy the jwt token and paste it in the Python files in the variable `AUTH_TOKEN` in the respective file(s).

## Queries?

For any queries/feedback, please reach out to my personal on my GitHub profile.
