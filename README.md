
# Phenoflow (modified server)

### Portable, workflow-based phenotype definitions.

## Configuration

### .env

1. Create a `.env` file in project root.

2. To this file, add the following,

```
##

## Environment variables

##

## Server port

PORT = 3000

## GitHub personal authentication token

AUTH_TOKEN =

## GitHub 'organization' name

OWNER =

## Phenoflow user details

USER_NAME =

USER_EMAIL =

```

3. Complete 'Organization' configuration.
4. Add the generated personal access token to `AUTH_TOKEN =`
5. Add the name of the created 'Organization' to personal access token to `OWNER =`
6. Add a name and email address to 
	`USER_NAME =`
	`USER_EMAIL =` 
accordingly, which identify the commiter.

### Organization

1. Visit [https://github.com/settings/organizations](https://github.com/settings/organizations).
2. Create a new 'Organization'. The Free tier is sufficient.
3. Visit [https://github.com/settings/tokens](https://github.com/settings/tokens).
4. Generate a new Fine-grained Personal Access Token.
		-	Select the created 'Organization' as the Resource owner.
		-	Select All repositories under Repository access.
		-	Select Read and write on all repository permissions under Permissions.
5. Copy this token to clipboard [web/proxy/certs/gen-domain-cert.sh](web/proxy/certs/gen-domain-cert.sh).

## Install and Run

This is a [Node.js](https://nodejs.org/en) server written with [Express.js](https://expressjs.com).

#### Server

1. Install dependencies:

```
npm init
```
2. Change directory:

```
cd server
```
2. Run server:
```
node index.js 
```
or...

```
nodemon 
```

## Tests

### Development

- At the root directory, run all tests:

`npm test`

## Usage

### Development

The server runs by default on port 3000. Visit http://localhost:3000/[route] to test changes to GET endpoints and use software such as [Postman](https://www.postman.com/downloads/) to test changes to POST, PUT and DELETE endpoints.

## Authors

[King's College London Health Informatics](https://kclhi.org),
[Kĩthia Ngigĩ](https://github.com/kithia)

