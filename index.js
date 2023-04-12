/**
 * Server file
 */

// Import statements
const express = require('express');
const app = express();
const fs = require('fs')
require("dotenv").config();

// Server port number
const PORT = process.env.PORT;

// Example phenotypes taken from Phenoflow
const STATIC_PHENOTYPES = require('./test/phenotypes.json');

// Project variables
const OWNER = process.env.OWNER;
const AUTH_TOKEN = process.env.AUTH_TOKEN;

// README variables
const README_COMMIT_MESSAGE = 'Initial README.md';
const README_PATH = 'README.md';
const README_TEMPLATE_PATH = './README-Template.md';

// LICENSE variables
const LICENSE_COMMIT_MESSAGE = 'Initial LICENSE.md';
const LICENSE_PATH = 'LICENSE.md';
const LICENSE_FILE_PATH = './LICENSE.md';

// User variables
const USER_NAME = process.env.USER_NAME;
const USER_EMAIL = process.env.USER_EMAIL;

// Miscellaneous variables
const CWL_EXTENSION = `.cwl`;
const ERROR_MESSAGE = 'Sorry an error occurred';

// Necessary to parse JSON request bodies
app.use(express.json());

/**
 * Octokit.js
 * https://github.com/octokit/core.js#readme
 * 
 * Taken from GitHub REST API Docs
 * https://docs.github.com/en/rest/guides/getting-started-with-the-rest-api?apiVersion=2022-11-28
 */
const { Octokit } = require("octokit");
const { error } = require('console');
const octokit = new Octokit({
  auth: AUTH_TOKEN
});


/**
 * Get Hex string representation of string
 * of different encoding
 * @param {String} string String to be encoded
 * @param {String} encoding 'hex', 'utf-8' or 'base64'
 * @returns Hex string with 0s included
 */
function hexOf(string, encoding) {
  // Encoding is utf-8 by default
  const stringBuffer = Buffer.from(string, encoding);
  let stringArray = [];
  for(const value of stringBuffer.values()) {
    let hexValue = value.toString(16);
    // Puts inserts zero on values less than 0x10
    if (hexValue.length == 1) {
      hexValue = `0${hexValue}`
    }
    stringArray.push(hexValue);
  }

  return stringArray.join('');
}

/**
 * Developer routes
 */

// Get GitHub API invokation quota information
app.get("/rate", async(request, response) => {
  try {
    const rate = await octokit.request('GET /rate_limit', {
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    return response.status(200).send(rate.data);
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

// Check if server is running
app.get("/", async(request, response) => {
  try {
    return response.status(200).send('Server is running');
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

/**
 * Read routes
 */
 
/**
 * Get the file or directory
 * @param {String} repo Repository name
 * @param {String} path File or Directory path [within repository]
 * @returns File or Directory
 */
async function getFileOrDirectory(repo, path) {
  
  try {
    const file = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: OWNER,
      repo: repo,
      path: path,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    return file;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

/**
 * Get a phenotype in phenoflow
 * @param {*} name Repository name
 * @returns Phenotype
 */
async function getPhenotype(name) {

  try {
    const repo = await octokit.request('GET /repos/{owner}/{repo}', {
      owner: OWNER,
      repo: name,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }, { accept: 'application/vnd.github+json' });

    return repo;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

/**
 * Get all phenotypes in GitHub
 * @returns Array of phenotypes
 */
async function getAllPhenotypes() {

  try {
    const repos = await octokit.request('GET /orgs/{org}/repos', {
      org: OWNER,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
  });

    return repos;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

/**
 * Get path of step of phenotype
 * @param {String} repo Repository name
 * @param {String} path [Phenotype name].cwl file path
 * @param {Number} number Step number
 * @returns Step path string
 */
async function getStepPath(repo, path, number) {
   
  try {
    // The .cwl instantiation file of a phenotype
    const file = await getFileOrDirectory(repo, path);
    
    let contentBuffer = Buffer.from(file.data.content, 'base64');
    let content = contentBuffer.toString('utf-8');
    const contentHex = hexOf(content, 'utf-8');
    
    /** 
     * Finds startIndex of the step path
     * from within contentHex
     */
    let searchString = `'${number}':\r\n    run: `;
    let searchHex = hexOf(searchString, 'utf-8');
    const startIndex = contentHex.indexOf(searchHex) + (searchHex.length);

    /** 
     * Finds endIndex of the step path
     * from within contentHex
     */
    searchString = CWL_EXTENSION;
    searchHex = hexOf(searchString, 'utf-8');
    const endIndex = contentHex.substring(startIndex).indexOf(searchHex) + startIndex + (searchHex.length);

    /** 
     * Uses startIndex and endIndex to slice the step path
     * out of contextHex
     */
    const stepHex = contentHex.substring(startIndex, endIndex); 

    // Final buffer and string
    const stepBuffer = Buffer.from(stepHex, 'hex');
    const stepPath = stepBuffer.toString('utf-8');

    return stepPath;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

/**
 * Get step of phenotype
 * @param {String} repo Repository name
 * @param {String} path [Phenotype name].cwl file path
 * @param {Number} number Step number
 * @returns Step
 */
async function getStep(repo, path, number) {
   
  try {
    const stepPath = await getStepPath(repo, path, number);
    const body = await getFileOrDirectory(repo, stepPath);

    return body;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

/**
 * Get description of step of phenotype
 * @param {String} repo Repository name
 * @param {String} path Step file path
 * @param {Nubmer} number Step number
 * @returns Step description string
 */
async function getStepDescription(repo, path, number) {
   
  try {
    // The .cwl step file of a phenotype
    const step = await getStep(repo, path, number);

    const contentBuffer = Buffer.from(step.data.content, 'base64');
    const content = contentBuffer.toString('utf-8');
    const contentHex = hexOf(content, 'utf-8');
    
    /** 
     * Finds startIndex of the step description
     * from within contentHex
     */
    let searchString = `doc: `;
    let searchHex = hexOf(searchString, 'utf-8');
    const startIndex = contentHex.indexOf(searchHex) + (searchHex.length);
    
    /** 
     * Finds endIndex of the step description
     * from within contentHex
     */
    searchString = '\nid: ';
    searchHex = hexOf(searchString, 'utf-8');
    const endIndex = contentHex.substring(startIndex).indexOf(searchHex) + startIndex;

    /** 
     * Uses startIndex and endIndex to slice the step path
     * out of contentHex
     */
    const descriptionHex = contentHex.substring(startIndex, endIndex);

    // Final buffer and string
    const descriptionBuffer = Buffer.from(descriptionHex, 'hex');
    const description = descriptionBuffer.toString('utf-8');
    
    return description;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

/**
 * Get JavaScript and/ or Python implementation of step of phenotype
 * @param {String} repo Repository name
 * @param {String} path [Phenotype name].cwl file path
 * @param {Number} number Step number
 * @returns Array of Step implementation files
 */
async function getStepImplmentations(repo, path, number) {

  try {
    const phenotype = await octokit.request('GET /repos/{owner}/{repo}/contents', {
      owner: OWNER,
      repo: repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }, { accept: 'application/vnd.github+json' });
    const contents = await getAllContents(phenotype.data, [], repo);

    /**
     * Searches for all JS and Python implementation
     * step files in the phenotype repository
     */
    let pathDict = {};
    let extensionDict = {'.js': false, '.py': false};
    contents.forEach(file => {
      for (const extension of Object.keys(extensionDict)) {
      /**
       * If extension (.js or .py) is in the file name
       * add file path to dictionary of files
       * and mark as present
       */
      if (file.name.indexOf(extension) != -1) {
        extensionDict[extension] = true;
        pathDict[file.name] = file.path;
      }}
    });
    
    // List of implemenation files
    let implementations = [];

    let stepPath = await getStepPath(repo, path, number);
    for (const [extension, value] of Object.entries(extensionDict)) {
      /**
       * If a step implmentation of type extension exists
       * add implementation file to implementations list
       */
      if (value) {
        // Ammeds discrepency in name of first step of phenotypes 
        // created with the default connector
        if (stepPath == 'read-potential-cases-disc.cwl') {
          stepPath = 'read-potential-cases.cwl';
        }

        /**
         * Formulates implmentation file path
         * by replacing .cwl extension with extension
         */
        const implementationPath = stepPath.replace(CWL_EXTENSION, extension);

        const body = await getFileOrDirectory(repo, pathDict[implementationPath]);
        implementations.push(body.data);
      }
    }

    return implementations;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

/**
 * Recursive function to get all files and folders within repo
 * @param {Array} data Current File and Directories to be searched
 * @param {Array} contents Files and Directories already searched
 * @param {String} repo Repository name
 * @returns Array of Files and Directories
 */
async function getAllContents(data, contents, repo) {
  let directories = []
  for (const datum of data) {
    /**
     * If path is of a folder (not a file)
     * adds folder to directories array.
     * (files contain a '.', folders do not)
     */
    if (datum.name.indexOf('.') == -1) {
      directories.push(datum);
    }
  }
  if (contents.length == 0) { contents = data }

  /** 
   * Base case
   * 
   * If no folders were found,
   * return all data
   */
  if (directories.length == 0) {
    return contents.concat(data);
  } 

  /**
   * Recursive case
   * 
   * If one or more folders are found,
   * recall function
   */
  else {
    for (const directory of directories) {
      const folders = await getFileOrDirectory(repo, directory.path);
      return await getAllContents(folders.data, contents, repo);
    }
  }
}

// Get all phenotypes
// Get all phenotypes created by an author
// Get all phenotypes with a particular substring in the name
app.get("/phenotypes", async(request, response) => {
  const author = request.query.author;
  const name = request.query.name;

  try {
    const repos = await getAllPhenotypes();
    let phenotypes = repos.data;
    let output = [];

    /**
     * If author and name are queried,
     * finds phenotypes matching a substring of name 
     * and created by author
     */
    if (typeof(author) != 'undefined' && typeof(name) != 'undefined') {
      
      /**
       * Searches for all phenotypes that have name 
       * as a substring of their name
       */
      for(const phenotype of phenotypes){
        if(phenotype.name.includes(name)) {
          // GETS the commit history of the repository
          const commits = await octokit.request('GET /repos/{owner}/{repo}/commits', {
            owner: OWNER,
            repo: phenotype.name,
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
          });

          /**
           * Searches for the author of the 
           * initial/ initialise README.md commit
           */
          let isAuthorFound = false;
          for(const commit of commits.data) {
            /** If the author matches, pushes
              the phenotype to output */
            if (commit.commit.message == README_COMMIT_MESSAGE &&
              commit.commit.author.name == author){
                isAuthorFound = true;
                output.push(phenotype);
            }
          }
          if (!isAuthorFound) {
            throw error;
          }
        }
      }
    }

    /**
     * If only author is queried,
     * finds phenotypes created by author
     */
    else if (typeof(author) != 'undefined') {

      // Searches through all phenotypes
      for(const phenotype of phenotypes){
        // GETS the commit history of the repository
        const commits = await octokit.request('GET /repos/{owner}/{repo}/commits', {
          owner: OWNER,
          repo: phenotype.name,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28'
          }
        });

        /** 
         * Searches for the author of the 
         * initial/ initialise README.md commit
         */
        let isAuthorFound = false;
        for(const commit of commits.data) {
          /** 
           * If the author matches, pushes
           * the phenotype to output
           */
          if (commit.commit.message == README_COMMIT_MESSAGE &&
            commit.commit.author.name == author){
              isAuthorFound = true;
            output.push(phenotype);
          }
        }
        if (!isAuthorFound) {
          throw error;
        }
      }
    }

    /** 
     * If only name is queried,
     * finds phenotypes matching a substring of name
     */
    else if (typeof(name) != 'undefined') {
      let isPhenotypeFound = false;
      for(const phenotype of phenotypes){
        /**
         * If name is a substring, pushes
         * the phenotype to output
         */
        if(phenotype.name.includes(name)) {
          isPhenotypeFound = true;
          output.push(phenotype);
        }
      }
      if (!isPhenotypeFound) {
        throw error;
      }
    }

    /** 
     * If no author or name was specified,
     * finds all phenotypes
     */
    else {
      output = phenotypes;
    }

    // Returns curated array of phenotypes
    return response.status(200).send(output);
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

// Get a single phenotype, by name
app.get("/phenotype/:name", async(request, response) => {
  const name = request.params.name;

  try {
    const repo = await getPhenotype(name);
    return response.status(200).send(repo.data);
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

// Get a single phenotype contents
app.get("/phenotype/:name/contents", async(request, response) => {
  const name = request.params.name;

  try {
    const repo = await octokit.request('GET /repos/{owner}/{repo}/contents', {
      owner: OWNER,
      repo: name,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }, { accept: 'application/vnd.github+json' });

    const contents = await getAllContents(repo.data, [], name);
    return response.status(200).send(contents);
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

// Get description of a single phenotype, by name
app.get("/phenotype/:name/description", async(request, response) => {
  const name = request.params.name;

  try {
    const readme = await octokit.request('GET /repos/{owner}/{repo}/readme', {
      owner: OWNER,
      repo: name,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }, { accept: 'application/vnd.github.raw' });

    let readmeHex = hexOf(readme.data.content, 'base64');

    /** 
     * Finds startIndex of the phenotype description
     * within readmeHex
     */
    let searchString = '- ';
    let searchHex = hexOf(searchString);
    const startIndex = readmeHex.indexOf(searchHex) + (searchString.length * 2);

    /** 
     * Finds endIndex of the phenotype description
     * within readmeHex
     */
    searchString = '##';
    searchHex = hexOf(searchString);
    const endIndex = readmeHex.indexOf(searchHex) - (searchString.length * 2);

    /** 
     * Uses startIndex and endIndex to slice the description
     * out of readmeHex
     */
    const descriptionHex = readmeHex.slice(startIndex, endIndex);

    // Final buffer
    const outputBuffer = Buffer.from(descriptionHex, 'hex');

    return response.status(200).send(outputBuffer.toString('utf-8'));
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

// Get a single step of phenotype, by phenotype and step number
app.get("/step/:step", async(request, response) => {
  const repo = request.body.repo;
  const path = `${repo}${CWL_EXTENSION}`;

  try {
    const step = await getStep(repo, path, request.params.step);
    return response.status(200).send(step.data);
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

// Get a single step of phenotype contents, by phenotype and step number
app.get("/step/:step/contents", async(request, response) => {
  const repo = request.body.repo;
  const path = `${request.body.repo}${CWL_EXTENSION}`;

  try {
    const step = await getStep(repo, path, request.params.step);

    const contentBuffer = Buffer.from(step.data.content, 'base64');
    const content = contentBuffer.toString('utf-8');
    return response.status(200).send(content);
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

// Get description of a single step of phenotype, by phenotype and step number
app.get("/step/:step/description", async(request, response) => {
  const repo = request.body.repo;
  const path = `${request.body.repo}${CWL_EXTENSION}`;
  const step = request.params.step;

  try {
    const description = await getStepDescription(repo, path, step);
    return response.status(200).send(description);
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

// Get a single step of phenotype contents, by phenotype and step number
app.get("/step/:step/implementation", async(request, response) => {
  const repo = request.body.repo;
  const path = `${request.body.repo}${CWL_EXTENSION}`;
  const step = request.params.step;

  try {
    const implementations = await getStepImplmentations(repo, path, step);
    return response.status(200).send(implementations);
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

/**
 * Method signature is here for completeness
 * 
 * Similar functionality is implmented in
 * 'GET' /step/:step/description
 */
app.get("/step/:step/input/description", async(request, response) => {
  pass;
});

/**
 * Method signature is here for completeness
 * 
 * Similar functionality is implmented in
 * 'GET' /step/:step/description
 */
app.get("/step/:step/output/description", async(request, response) => {
  pass;
});

// Get single file or directory, by path
app.get("/file", async(request, response) => {
  const repo = request.body.repo;
  const path = request.body.path;

  try {
    const file = await getFileOrDirectory(repo, path);
    return response.status(200).send(file.data);
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

// Get contents of a single file or directory, by path
app.get("/file/contents", async(request, response) => {
  const repo = request.body.repo;
  const path = request.body.path;

  try {
    const file = await getFileOrDirectory(repo, path);
    let output = file;

    // If path is a file, get string content of the file
    if (typeof(file.data.content) != 'undefined') {
      const contentBuffer = Buffer.from(file.data.content, 'base64');
      const content = contentBuffer.toString('utf-8');
      output = content
    }

    return response.status(200).send(output);
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

/**
* Create routes
*/

/**
 * Creates standard LICENSE.md file for a phenotype, 
 * from ./LICENSE.md
 * @param {String} name Repository name
 * @returns 1 if successful, else error
 */
async function createLICENSE(name) {
  const repo = name;

  // Parses template LICENSE.md file
  const license = fs.readFileSync(LICENSE_FILE_PATH).toString();
  const licenseHex = hexOf(license, 'utf-8');

  // Final buffer
  const outputBuffer = Buffer.from(licenseHex, 'hex');
  
  try {
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: OWNER,
      repo: repo,
      path: LICENSE_PATH,
      message: LICENSE_COMMIT_MESSAGE,
      committer: {
        name: USER_NAME,
        email: USER_EMAIL
      },
      // GitHub REST API requires content in base-64
      content: outputBuffer.toString('base64'),
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    console.log(`Created ${repo}/${LICENSE_PATH} file`);
    return 1;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

/**
 * Creates standard README.md file for a phenotype, 
 * from ./README-Template.md
 * @param {String} name Repository name
 * @param {String} about <Phenotype ID> - <Phenotype description>
 * @returns 1 if successful, else error
 */
async function initialiseREADME(name, about) {
  const repo = name;

  // Parses template README.md file
  const template = fs.readFileSync(README_TEMPLATE_PATH).toString();
  let templateHex = hexOf(template, 'utf-8');

  // Dummy name variable
  let searchString = hexOf('<Name>', 'utf-8');
  // Searches for all apperances of searchString
  const nameHex = hexOf(repo, 'utf-8');
  // Replaces all occurances of searchString with true name
  while(templateHex.indexOf(searchString) != -1) {
    templateHex = templateHex.replace(searchString, nameHex);
  }
  
  // Dummy description variable
  searchString = hexOf('<ID> - <Description>', 'utf-8');
  // Searches for apperance of searchString
  const descriptionHex = hexOf(about, 'utf-8');
  // Replaces all occurance of searchString with true description
  templateHex = templateHex.replace(searchString, descriptionHex);

  // Final buffer
  const outputBuffer = Buffer.from(templateHex, 'hex');
  
  try {
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: OWNER,
      repo: repo,
      path: README_PATH,
      message: README_COMMIT_MESSAGE,
      committer: {
        name: USER_NAME,
        email: USER_EMAIL
      },
      // GitHub REST API requires content in base-64
      content: outputBuffer.toString('base64'),
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    console.log(`Initialised ${repo}/${README_PATH} file`);
    return 1;
  } catch (error) {
    console.log(error);
    throw error;
  }
};


/**
 * Creates a phenotype repo
 * @param {String} name Repository name
 * @returns 1 if successful, else error
 */
async function createPhenotype(name) {
  
  try {
    await octokit.request('POST /orgs/{org}/repos', {
      org: OWNER,
      name: name,
      description: `${name} phenotype. Created by ${USER_NAME}.`,
      'private': false,
      has_issues: true,
      has_projects: true,
      has_wiki: true,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    console.log(`Created ${name} phenotype`);
    return 1;
  } catch (error) {
    console.log(error);
    throw error;
  } 
};


/**
 * Creates a repo file
 * @param {String} repo Repository name
 * @param {String} path File path [within repository]
 * @param {String} content File content [Base64]
 * @returns 1 if successful, else error
 */
async function createFile(repo, path, content) {
  
  try {
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: OWNER,
      repo: repo,
      path: path,
      message: `Created ${path}`,
      committer: {
        name: USER_NAME,
        email: USER_EMAIL
      },
      content: content,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    console.log(`Created ${repo}/${path} file`);
    return 1;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

/**
 * Implemented for development and testing purposes
 * 
 * Create empty phenotypes from ./phenotypes-reduced.json
 */
app.post("/initialise", async (request, response) => {

  try {
    const remotePhenotypes = await octokit.request('GET /orgs/{org}/repos', {
      org: OWNER,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    // List of existing phenotypes in GitHub
    let remoteNames = [];

    // Populate remoteNames
    remotePhenotypes.data.forEach(phenotype => {
      remoteNames.push(phenotype.name.toLowerCase())
    });

    for(const phenotype of STATIC_PHENOTYPES) {
      const name = phenotype.name.toLowerCase()
      /**
       * If static phenotype does not exist in GitHub,
       * create phenotype, intialise README.md and
       * create LICENSE.md
       */
      if (!remoteNames.includes(name)) {
        await createPhenotype(phenotype.name);
        await initialiseREADME(phenotype.name, phenotype.about);
        await createLICENSE(phenotype.name);

        // Populate phenotype repository with its files
        const files = phenotype.files;
        for(const file of files){
          await createFile(phenotype.name, file.path, file.content);
        }
      }
    }

    response.status(200).send();
  } catch (error) {
    console.log(error);
    response.status(500).send(ERROR_MESSAGE);
  }
});

// Create empty phenotype with name
app.post("/phenotype", async(request, response) => {
  const name = request.body.name;
  const about = request.body.about;
  const files = request.body.files;

  try {
    await createPhenotype(name);
    await initialiseREADME(name, about);
    await createLICENSE(name);

    /**
     * If files were also sent,
     * populate phenotype repository with its files
     */
    if(typeof(files) != 'undefined' && files.length != 0) {
      for(const file of files){
        await createFile(name, file.path, file.content);
      }
    }

    return response.status(200).send();
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

// Create file within a phenotype by path
app.post("/file", async(request, response) => {
  const repo = request.body.repo;
  const path = request.body.path;
  const content = request.body.content;

  try {
    await createFile(repo, path, content);
    response.status(200).send();
  } catch (error) {
    console.log(error);
    response.status(500).send(ERROR_MESSAGE);
  }
});

// Create multiple files within one or more phenotypes by path
app.post("/files", async(request, response) => {
  try {
    for(const element of request.body) {
      const repo = element.repo;
      const path = element.path;
      const content = element.content;

      await createFile(repo, path, content);
    }

    return response.status(200).send();
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

/**
* Update routes
*/

/**
 * Update description of a single phenotype, by name
 * 
 * Description is located in the README.md file of repo
 */
app.put("/phenotype/:name/description", async(request, response) => {
  const repo = request.params.name;
  const description = request.body.description;

  try {
    // GETS README.md file from GitHub
    const readme = await octokit.request('GET /repos/{owner}/{repo}/readme', {
      owner: OWNER,
      repo: repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }, { accept: 'application/vnd.github.raw' });
    
    // Converts new description and README.md contents to hex
    let descriptionHex = hexOf(description, 'utf-8');
    let readmeHex = hexOf(readme.data.content, 'base64');

    /**
     * Finds startIndex of the phenotype description
     * within readmeHex
     */
    let searchString = '- ';
    let searchHex = hexOf(searchString, 'utf-8');
    const startIndex = readmeHex.indexOf(searchHex) + (searchString.length * 2);

    /**
     * Finds endIndex of the phenotype description
     * within readmeHex
     */
    searchString = '##';
    searchHex = hexOf(searchString, 'utf-8')
    const endIndex = readmeHex.indexOf(searchHex) - (searchString.length * 2);

    /**
     * Uses startIndex and endIndex to replace the existing description
     * with the new description
     */
    readmeHex = readmeHex.slice(0, startIndex) + descriptionHex + readmeHex.slice(endIndex);

    // Final buffer
    const outputBuffer = Buffer.from(readmeHex, 'hex');

    // PUTS new description in README.md file
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: OWNER,
      repo: repo,
      path: README_PATH,
      message: 'Updated description.',
      committer: {
        name: USER_NAME,
        email: USER_EMAIL
      },
      // GitHub API requires content in base-64
      content: outputBuffer.toString('base64'),
      // SHA taken from README.md file data
      sha: readme.data.sha,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    return response.status(200).send();
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

// Update description of a single step of phenotype, by phenotype and step number
app.put("/step/:step/description", async(request, response) => {
  const repo = request.body.repo;
  /** 
   * Produces the step file's path from the
   * repository's name
   */
  const path = `${request.body.repo}${CWL_EXTENSION}`;
  const description = request.body.description;

  try {
    const step = await getStep(repo, path, request.params.step);
    const stepPath = await getStepPath(repo, path, request.params.step);

    // Converts new description and step file contents to hex
    let descriptionHex = hexOf(description, 'utf-8');
    let stepHex = hexOf(step.data.content, 'base64');

    /** Finds startIndex of the step description
      within stepHex */
    let searchString = 'doc: ';
    let searchHex = hexOf(searchString, 'utf-8');
    const startIndex = stepHex.indexOf(searchHex) + (searchString.length * 2);

    /**
     * Finds endIndex of the step description
     * within stepHex
     */
    searchString = '\nid: ';
    searchHex = hexOf(searchString, 'utf-8');
    const endIndex = stepHex.indexOf(searchHex);

    /**
     * Uses startIndex and endIndex to replace the existing description
     * with the new description
     */
    stepHex = stepHex.slice(0, startIndex) + descriptionHex + stepHex.slice(endIndex);

    // Final buffer
    const outputBuffer = Buffer.from(stepHex, 'hex');

    // PUTS new description in step file
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: OWNER,
      repo: repo,
      path: stepPath,
      message: `Updated step ${request.params.step} description.`,
      committer: {
        name: USER_NAME,
        email: USER_EMAIL
      },
      // GitHub REST API requires content in base-64
      content: outputBuffer.toString('base64'),
      // SHA taken from step file data
      sha: step.data.sha,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    return response.status(200).send();
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

/**
 * Method signature is here for completeness
 * 
 * Similar functionality is implmented in
 * 'PUT' /step/:step/description
 */
app.put("/step/:step/input/description", async(request, response) => {
  pass;
});

/**
 * Method signature is here for completeness
 * 
 * Similar functionality is implmented in
 * 'PUT' /step/:step/description
 */
app.get("/step/:step/output/description", async(request, response) => {
  pass;
});

// Update file within a phenotype by path
app.put("/file", async(request, response) => {
  const repo = request.body.repo;
  const path = request.body.path;
  // Content mus be in base-64
  const content = request.body.content;

  try {
    const file = await getFileOrDirectory(repo, path);

    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: OWNER,
      repo: repo,
      path: path,
      message: `Updated ${path}`,
      committer: {
        name: USER_NAME,
        email: USER_EMAIL
      },
      // GitHub REST API requires content in base-64
      content: content,
      // SHA taken from step file data
      sha: file.data.sha,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    response.status(200).send();
  } catch (error) {
    console.log(error);
    response.status(500).send(ERROR_MESSAGE);
  }
});

/**
* Delete routes
*/

/**
 * Delete a phenotype repository
 * @param {String} name Respository name
 * @returns 1 if successful, else error
 */
async function deletePhenotype(name) {

  try {
    await octokit.request('DELETE /repos/{owner}/{repo}', {
      owner: OWNER,
      repo: name,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    console.log(`Deleted ${name} phenotype`);
    return 1;
  } catch (error) {
    console.log(error);
    throw error;
  } 
};

/**
 * Delete a file in phenotype repository
 * @param {*} repo Repository name
 * @param {*} path File path [within repository]
 * @returns 1 if successful, else error
 */
async function deleteFile(repo, path) {

  try {
    /**
     * First finds the sha value associated with the file 
     * [file.data.sha]
     */ 
    const file = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: OWNER,
      repo: repo,
      path: path,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    // Deletes file
    await octokit.request('DELETE /repos/{owner}/{repo}/contents/{path}', {
      owner: OWNER,
      repo: repo,
      path: path,
      message: `Deleted ${path}`,
      committer: {
        name: USER_NAME,
        email: USER_EMAIL
      },
      // SHA taken from step file data
      sha: file.data.sha,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    console.log(`Deleted ${repo}/${path} file`);
    return 1;
  } catch (error) {
    console.log(error);
    throw error;
  } 
};

// Delete multiple phenotypes, by name
app.delete("/phenotypes", async(request, response) => {
  const author = request.body.author;
  const names = request.body.repos;

  try {
    // List of pphenotypes to be deleted
    let deletes = [];
    
    /**
     * If names array is present and not empty,
     * only delete these phenotypes
     */
    if(typeof(names) != 'undefined' && names.length != 0) {
      for(const name of names) {
        const repo = await getPhenotype(name);
        deletes.push(repo.data);
      }
    } 
    /**
     * If names array not present or is empty,
     * delete all phenotypes
     */
    else {
      const repos = await getAllPhenotypes();
      deletes = repos.data;
    }

    for(const repo of deletes) {
      const name = repo.name;
      const commits = await octokit.request('GET /repos/{owner}/{repo}/commits', {
        owner: OWNER,
        repo: name,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      /**
       * Searches for the author of the 
       * initial/ initialise README.md commit
       */
      let isAuthorFound = false
      for(const commit of commits.data) {
        /** 
         * If the author matches, pushes
         * the phenotype to output
         */
        if (commit.commit.message == README_COMMIT_MESSAGE &&
          commit.commit.author.name == author){
            isAuthorFound = true;
            await deletePhenotype(name);
        }
      }
      if (!isAuthorFound) {
        throw error;
      }
    }
    
    return response.status(200).send();
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

// Delete a single phenotypes, by name and author
app.delete("/phenotype/:name", async(request, response) => {
  const author = request.body.author;
  const name = request.params.name;

  try {
    const commits = await octokit.request('GET /repos/{owner}/{repo}/commits', {
      owner: OWNER,
      repo: name,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    /** 
     * Searches for the author of the 
     * initial/ initialise README.md commit
     */
    let isAuthorFound = false
    for(const commit of commits.data) {
      /** 
       * If the author matches, pushes
       * the phenotype to output
       */
      if (commit.commit.message == README_COMMIT_MESSAGE &&
        commit.commit.author.name == author){
        await deletePhenotype(name);
        isAuthorFound = true;
      }
    }
    if (!isAuthorFound) {
      throw error;
    }
    
    return response.status(200).send();
  } catch (error) {
    console.log(error)
    return response.status(500).send(ERROR_MESSAGE);
  }
});

/**
 * Delete all phenotypes in Phenoflow
 * 
 * USE WITH CAUTION
 */
app.delete("/phenotypes/all", async(request, response) => {

  try {
    const repos = await octokit.request('GET /orgs/{org}/repos', {
      org: OWNER,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    /**
     * If the Phneflow project is kept in
     * the same organisation as the repositories is will not be deleted
     */ 
    for(const phenotype of repos.data) {
      /**
       * If other non-phenotype repositories are
       * kept in the this GitHub organisation,
       * please add their names to keepRepsitories
       * to prevent data loss
       */ 
      const keepRepositories = ['phenoflow-server'];
      if (!keepRepositories.includes(phenotype.name)) {
        await deletePhenotype(phenotype.name);
      }
    };

    return response.status(200).send(repos.data);
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

// Delete a single file or directory, by path
app.delete("/file", async(request, response) => {
    const repo = request.body.repo;
    const path = request.body.path;

  try {
    await deleteFile(repo, path);
    return response.status(200).send();
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

// Delete multiple files or directories, by path
app.delete("/files", async(request, response) => {

  try {
    for(const element of request.body) {
      const repo =  element.repo;
      const path = element.path;
      await deleteFile(repo, path);
    }
    
    return response.status(200).send();
  } catch (error) {
    console.log(error);
    return response.status(500).send(ERROR_MESSAGE);
  }
});

app.listen(PORT, () => {
  console.log(`Phenoflow server listening on port ${PORT}`)
});

// Necessary exports for tests to run
module.exports = { app, STATIC_PHENOTYPES, ERROR_MESSAGE, LICENSE_PATH, README_PATH, USER_NAME };
