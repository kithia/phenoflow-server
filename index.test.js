/**
 * Test file for index.js
 */

//Required dependencies
let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('./index').app;

let expect = chai.expect;

// External variables
const USER_NAME = require('./index').USER_NAME;
const LICENSE_PATH = require('./index').LICENSE_PATH;
const README_PATH = require('./index').README_PATH;
const STATIC_PHENOTYPES = require('./test/phenotypes.json');
const TEST = require('./test/TEST.json');
const { ERROR_MESSAGE } = require('./index');

/**
 * Limit for how long each test should run
 * in milliseconds 
 */

// Timeout limits (milliseconds)

const TIMEOUT = 20000;
/**
 * Creating many files and complete phenotypes
 * in GitHub at once, can take some time
 */  
const EXTENDED_TIMEOUT = 90000;

chai.use(chaiHttp);

// False phenotype names
const NEGATIVE_PHENOTYPE_NAMES = [`nodisease`, `no disease`, `nodisease-1`, `no disease 1`, `nodisease-!`, `no disease !`];

// False user names
const NEGATIVE_USER_NAMES = [`nouser`, `no user`, `nouser-1`, `no user 1`, `nouser-!`, `no user !`, ``];

// False, non-existant phenotype step numbers
const EXTREME_STEP_NUMBERS = [-1, 0, 50, 100, 1000];

/**
 * 'GET' endpoint tests
 */

// 'GET' endpoints test block
describe('Suite: Phenoflow server GET endpoints', () => {
  before(async function() {
    this.timeout(EXTENDED_TIMEOUT);
    
    // Populate the database
    try {
      const response = await chai.request(server)
        .post('/initialise');
        expect(response).to.have.status(200);
    } catch (error) {
      console.error('Error repopulating database:', error);
      throw error;
    }
  });

  // Positive cases

  it('Should get that server is running', function(done) {
    this.timeout(TIMEOUT);
    chai.request(server)
    .get('/')
    .end(async(error, response) => {
      expect(response).to.have.status(200);
      expect(response.text).to.equal('Server is running');
      done();
    })
  });
  
  it('Should get all phenotypes in GitHub', function(done) {
    this.timeout(TIMEOUT);
    chai.request(server)
      .get('/phenotypes')
      .end(async(error, response) => {
        expect(response).to.have.status(200);
        expect(response.body).to.be.an('array');
        expect(response.body).to.have.lengthOf(STATIC_PHENOTYPES.length);
        done();
      });
  });

  it(`Should get all phenotypes of ${USER_NAME}`, function(done) {
    this.timeout(TIMEOUT);
    chai.request(server)
      .get(`/phenotypes?author=${USER_NAME}`)
      .end(async(error, response) => {
        expect(response).to.have.status(200);
        expect(response.body).to.be.an('array');
        expect(response.body).to.have.lengthOf(STATIC_PHENOTYPES.length);
        done();
      });
  });

  for (const phenotype of STATIC_PHENOTYPES) {
    const name = phenotype.name;

    it(`Should get the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .get(`/phenotypes?name=${name}`)
        .end(async(error, response) => {
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('array');
          done();
        });
    });

    it(`Should get the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .get(`/phenotypes?author=${USER_NAME}&name=${name}`)
        .end(async(error, response) => {
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('array');
          done();
        });
    });

    it(`Should get the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .get(`/phenotype/${name}`)
        .end(async (error, response) => {
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('object');
          expect(response.body).to.have.property('name').that.equals(name);
          done();
        });
    });
  
    it(`Should get contents of the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .get(`/phenotype/${name}/contents`)
        .end(async (error, response) => {
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('array');
          done();
        });
    });

    it(`Should get description of the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .get(`/phenotype/${name}/description`)
        .end(async (error, response) => {
          expect(response).to.have.status(200);
          expect(response.text).to.be.a('string');
          done();
        });
    });

    it(`Should get first step of the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .get(`/step/1`)
        .send({
          repo: name
        })
        .end(async (error, response) => {
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('object');
          expect(response.body).to.have.property('content');
          done();
          });
    });

    it(`Should get file contents of first step of the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .get(`/step/1/contents`)
        .send({
          repo: name
        })
        .end(async (error, response) => {
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('object');
          done();
          });
    });

    it(`Should get description of first step of the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .get(`/step/1/description`)
        .send({
          repo: name
        })
        .end(async (error, response) => {
          expect(response).to.have.status(200);
          expect(response.text).to.be.a('string');
          done();
          });
    });

    it(`Should get implmentation of first step of the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .get(`/step/1/implementation`)
        .send({
          repo: name
        })
        .end(async (error, response) => {
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('array');
          expect(response.body.length).to.be.at.most(2);
          done();
          });
    });

    it(`Should get LICENSE.md file of the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .get(`/file`)
        .send({
          repo: name,
          path: LICENSE_PATH
        })
        .end(async (error, response) => {
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('object');
          expect(response.body).to.have.property('content');
          done();
          });
    });

    it(`Should get contents of LICENSE.md file of the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .get(`/file/contents`)
        .send({
          repo: name,
          path: LICENSE_PATH
        })
        .end(async (error, response) => {
          expect(response).to.have.status(200);
          expect(response.text).to.be.a('string');
          done();
        });
    });
  }

  // Negative cases
  for (const user_name of NEGATIVE_USER_NAMES) {

    it(`Should not get phenotypes of ${user_name}`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .get(`/phenotypes?author=${user_name}`)
        .end(async(error, response) => {
          expect(response).to.have.status(500);
          expect(response.text).to.equal(ERROR_MESSAGE);
          done();
        });
    });

    for (const phenotype of STATIC_PHENOTYPES) {
      const name = phenotype.name;
      
      it(`Should not get the ${name} phenotype`, function(done) {
        this.timeout(TIMEOUT);
        chai.request(server)
          .get(`/phenotypes?author=${name}`)
          .end(async(error, response) => {
            expect(response).to.have.status(500);
            expect(response.text).to.equal(ERROR_MESSAGE);
            done();
          });
      });

      it(`Should get not the ${name} phenotype`, function(done) {
        this.timeout(TIMEOUT);
        chai.request(server)
          .get(`/phenotypes?author=${user_name}&name=${name}`)
          .end(async(error, response) => {
            expect(response).to.have.status(500);
            expect(response.text).to.equal(ERROR_MESSAGE);
            done();
          });
      });

      for(const number of EXTREME_STEP_NUMBERS){

        it(`Should not get ${number}th step of the ${name} phenotype`, function(done) {
          this.timeout(TIMEOUT);
          chai.request(server)
            .get(`/step/${number}`)
            .send({
              repo: name
            })
            .end(async (error, response) => {
              expect(response).to.have.status(500);
              expect(response.text).to.equal(ERROR_MESSAGE);
              done();
            });
        });
  
        it(`Should not get file contents of ${number}th step of the ${name} phenotype`, function(done) {
          this.timeout(TIMEOUT);
          chai.request(server)
            .get(`/step/${number}/contents`)
            .send({
              repo: name
            })
            .end(async (error, response) => {
              expect(response).to.have.status(500);
              expect(response.text).to.equal(ERROR_MESSAGE);
              done();
            });
        });
  
        it(`Should not get description of ${number}th step of the ${name} phenotype`, function(done) {
          this.timeout(TIMEOUT);
          chai.request(server)
            .get(`/step/${number}/description`)
            .send({
              repo: name
            })
            .end(async (error, response) => {
              expect(response).to.have.status(500);
              expect(response.text).to.equal(ERROR_MESSAGE);
              done();
            });
        });
      }
    }
  }

  for (const name of NEGATIVE_PHENOTYPE_NAMES) {

    it(`Should not get the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .get(`/phenotype/${name}`)
        .end(async (error, response) => {
          expect(response).to.have.status(500);
          expect(response.text).to.equal(ERROR_MESSAGE);
          done();
        });
    });
  
    it(`Should not get contents of the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .get(`/phenotype/${name}/contents`)
        .end(async (error, response) => {
          expect(response).to.have.status(500);
          expect(response.text).to.equal(ERROR_MESSAGE);
          done();
        });
    });

    it(`Should not get description of the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .get(`/phenotype/${name}/description`)
        .end(async (error, response) => {
          expect(response).to.have.status(500);
          expect(response.text).to.equal(ERROR_MESSAGE);
          done();
        });
    });

    for(const number of EXTREME_STEP_NUMBERS) {

      it(`Should not get ${number}th step of the ${name} phenotype`, function(done) {
        this.timeout(TIMEOUT);
        chai.request(server)
          .get(`/step/${number}`)
          .send({
            repo: name
          })
          .end(async (error, response) => {
            expect(response).to.have.status(500);
            expect(response.text).to.equal(ERROR_MESSAGE);
            done();
          });
      });

      it(`Should not get file contents of ${number}th step of the ${name} phenotype`, function(done) {
        this.timeout(TIMEOUT);
        chai.request(server)
          .get(`/step/${number}/contents`)
          .send({
            repo: name
          })
          .end(async (error, response) => {
            expect(response).to.have.status(500);
            expect(response.text).to.equal(ERROR_MESSAGE);
            done();
          });
      });

      it(`Should not get description of ${number}th step of the ${name} phenotype`, function(done) {
        this.timeout(TIMEOUT);
        chai.request(server)
          .get(`/step/${number}/description`)
          .send({
            repo: name
          })
          .end(async (error, response) => {
            expect(response).to.have.status(500);
            expect(response.text).to.equal(ERROR_MESSAGE);
            done();
          });
      });

      it(`Should not get implementation of ${number}th step of the ${name} phenotype`, function(done) {
        this.timeout(TIMEOUT);
        chai.request(server)
          .get(`/step/${number}/implementation`)
          .send({
            repo: name
          })
          .end(async (error, response) => {
            expect(response).to.have.status(500);
            expect(response.text).to.equal(ERROR_MESSAGE);
            done();
          });
      });
    }

    it(`Should not get LICENSE.md file of the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .get(`/file`)
        .send({
          repo: name,
          path: LICENSE_PATH
        })
        .end(async (error, response) => {
          expect(response).to.have.status(500);
          expect(response.text).to.equal(ERROR_MESSAGE);
          done();
          });
    });

    it(`Should not get contents of LICENSE.md file of the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .get(`/file/contents`)
        .send({
          repo: name,
          path: LICENSE_PATH
        })
        .end(async (error, response) => {
          expect(response).to.have.status(500);
          expect(response.text).to.equal(ERROR_MESSAGE);
          done();
          });
    });
  }

  after(async function() {
    this.timeout(EXTENDED_TIMEOUT);
    
    // Delete all records from the database
    try {
      const response = await chai.request(server)
        .delete('/phenotypes/all');
        expect(response).to.have.status(200);
    } catch (error) {
      console.error('Error deleting records:', error);
      throw error;
    }
  });
});

/**
 * 'POST' endpoint tests
 */

// 'POST' endpoints test block
describe(`Suite: Phenoflow server 'POST' endpoints`, () => {
  before(async function() {
    this.timeout(EXTENDED_TIMEOUT);
    
    // Delete all records from the database
    try {
      const response = await chai.request(server)
        .delete('/phenotypes/all');
      expect(response).to.have.status(200);
    } catch (error) {
      console.error('Error deleting records:', error);
      throw error;
    }
  });

  // Positive cases

  for (const phenotype of STATIC_PHENOTYPES) {
    let name = phenotype.name;
    let about = phenotype.about;
    let files = phenotype.files;

    it(`Should create the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .post(`/phenotype`)
        .send({
          name: name,
          about: about,
          files: files 
        })
        .end(async (error, response) => {
          expect(response).to.have.status(200);
          done();
        });
    });

    it(`Should create TEST.md file in the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .post(`/file`)
        .send({
          repo: name,
          path: TEST[0].path,
          content: TEST[0].content,
        })
        .end(async (error, response) => {
          expect(response).to.have.status(200);
          done();
        });
    });

    it(`Should create TEST-1.md and TEST-2.md files in the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .post(`/files`)
        .send([{
          repo: name,
          path: TEST[1].path,
          content: TEST[1].content,
        }, {
          repo: name,
          path: TEST[2].path,
          content: TEST[2].content,
        }])
        .end(async (error, response) => {
          expect(response).to.have.status(200);
          done();
        });
    });
  }

  after(async function() {
    this.timeout(EXTENDED_TIMEOUT);
    
    // Delete all records from the database
    try {
      const response = await chai.request(server)
        .delete('/phenotypes/all');
        expect(response).to.have.status(200);
    } catch (error) {
      console.error('Error deleting records:', error);
      throw error;
    }
  });
});

/**
 * 'PUT' endpoint tests
 */

// 'PUT' endpoints test block
describe(`Suite: Phenoflow server 'PUT' endpoints`, () => {
  before(async function() {
    this.timeout(EXTENDED_TIMEOUT);
    
    // Populate the database
    try {
      const response = await chai.request(server)
        .post('/initialise');
        expect(response).to.have.status(200);
    } catch (error) {
      console.error('Error repopulating database:', error);
      throw error;
    }
  });

  // Positive cases

  for (const phenotype of STATIC_PHENOTYPES) {
    let name = phenotype.name;

    it(`Should put new decription for the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .put(`/phenotype/${name}/description`)
        .send({
          description: "TEST DESCRIPTION",
        })
        .end(async (error, response) => {
          expect(response).to.have.status(200);
          done();
        });
    });

    it(`Should put new decription for first step of the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .put(`/step/1/description`)
        .send({
          repo: name,
          description: "TEST DESCRIPTION",
        })
        .end(async (error, response) => {
          expect(response).to.have.status(200);
          done();
        });
    });

    it(`Should put TEST.md file content into LICENSE.md file of the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .put(`/file`)
        .send({
          repo: name,
          path: LICENSE_PATH,
          content: TEST[0].content,
        })
        .end(async (error, response) => {
          expect(response).to.have.status(200);
          done();
        });
    });
  }

  // Negative cases

  for (const name of NEGATIVE_PHENOTYPE_NAMES) {

    it(`Should not put new decription for the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .put(`/phenotype/${name}/description`)
        .send({
          description: "TEST DESCRIPTION",
        })
        .end(async (error, response) => {
          expect(response).to.have.status(500);
          expect(response.text).to.be.equal(ERROR_MESSAGE);
          done();
        });
    });

    it(`Should not put new decription for first step of the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .put(`/step/1/description`)
        .send({
          repo: name,
          description: "TEST DESCRIPTION",
        })
        .end(async (error, response) => {
          expect(response).to.have.status(500);
          expect(response.text).to.be.equal(ERROR_MESSAGE);
          done();
        });
    });

    it(`Should not put TEST.md file content into LICENSE.md file of the ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .put(`/file`)
        .send({
          repo: name,
          path: LICENSE_PATH,
          content: TEST[0].content,
        })
        .end(async (error, response) => {
          expect(response).to.have.status(500);
          expect(response.text).to.be.equal(ERROR_MESSAGE);
          done();
        });
    });
  }

  after(async function() {
    this.timeout(EXTENDED_TIMEOUT);
    
    // Delete all records from the database
    try {
      const response = await chai.request(server)
        .delete('/phenotypes/all');
      expect(response).to.have.status(200);
    } catch (error) {
      console.error('Error deleting records:', error);
      throw error;
    }
  });
});

/**
 * 'DELETE' endpoint tests
 */

// 'DELETE' endpoints test block
describe(`Suite: Phenoflow server 'DELETE' endpoints`, () => { 
  beforeEach(async function() {
    this.timeout(EXTENDED_TIMEOUT);
  
    // Repopulate the database
    try {
      const response = await chai.request(server)
        .post('/initialise');
      expect(response).to.have.status(200);
    } catch (error) {
      console.error('Error repopulating database:', error);
      throw error;
    }
  });

  // Positive cases

  it('Should delete all phenotypes in GitHub', function(done) {
    this.timeout(TIMEOUT);
    chai.request(server)
      .delete('/phenotypes/all')
      .end(async(error, response) => {
        expect(response).to.have.status(200);
        done();
      });
  });

  it(`Should delete all phenotypes for ${USER_NAME} in GitHub`, function(done) {
    this.timeout(TIMEOUT);
    chai.request(server)
      .delete('/phenotypes')
      .send({
        // Array of all name fields in STATIC_PHENOTYPES
        repos: Object.keys(STATIC_PHENOTYPES).map(key => STATIC_PHENOTYPES[key].name),
        author: USER_NAME
      })
      .end(async(error, response) => {
        expect(response).to.have.status(200);
        done();
      });
  });

  // Negative cases

  it(`Should not delete all phenotypes for ${USER_NAME} in GitHub`, function(done) {
    this.timeout(TIMEOUT);
    chai.request(server)
      .delete('/phenotypes')
      .send({
        // Array of all name fields in STATIC_PHENOTYPES
        repos: NEGATIVE_PHENOTYPE_NAMES,
        author: USER_NAME
      })
      .end(async(error, response) => {
        expect(response).to.have.status(500);
        expect(response.text).to.be.equal(ERROR_MESSAGE);
        done();
      });
  });

  for (const user_name of NEGATIVE_USER_NAMES) {

    it(`Should not delete all phenotypes for ${user_name} in GitHub`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .delete('/phenotypes')
        .send({
          // Array of all name fields in STATIC_PHENOTYPES
          repos: Object.keys(STATIC_PHENOTYPES).map(key => STATIC_PHENOTYPES[key].name),
          author: user_name
        })
        .end(async(error, response) => {
          expect(response).to.have.status(500);
          expect(response.text).to.be.equal(ERROR_MESSAGE);
          done();
        });
    });

    it(`Should not delete all phenotypes for ${user_name} in GitHub`, function(done) {
      this.timeout(TIMEOUT);
      chai.request(server)
        .delete('/phenotypes')
        .send({
          repos: NEGATIVE_PHENOTYPE_NAMES,
          author: user_name
        })
        .end(async(error, response) => {
          expect(response).to.have.status(500);
          expect(response.text).to.be.equal(ERROR_MESSAGE);
          done();
        });
    });
  }

  after(async function() {
    this.timeout(EXTENDED_TIMEOUT);
    
    // Delete all records from the database
    try {
      const response = await chai.request(server)
        .delete('/phenotypes/all');
      expect(response).to.have.status(200);
    } catch (error) {
      console.error('Error deleting records:', error);
      throw error;
    }
  });
});

// 'DELETE' endpoint test block
describe('Suite: Phenoflow DELETE /phenotype/:name endpoint', () => { 
  before(async function() {
    this.timeout(EXTENDED_TIMEOUT);
  
    // Repopulate the database
    try {
      const response = await chai.request(server)
        .post('/initialise');
      expect(response).to.have.status(200);
    } catch (error) {
      console.error('Error repopulating database:', error);
      throw error;
    }
  });

  // Positive cases

  for (const phenotype of STATIC_PHENOTYPES) {
    const name = phenotype.name;

    it(`Should delete ${name} phenotype in GitHub`, function(done) {
      this.timeout(TIMEOUT)
      chai.request(server)
        .delete(`/phenotype/${name}`)
        .send({
          author: USER_NAME
        })
        .end(async(error, response) => {
          expect(response).to.have.status(200);
          done();
        });
    });
  }

  // Negative cases

  for (const name of NEGATIVE_PHENOTYPE_NAMES) {

    it(`Should not delete ${name} phenotype in GitHub`, function(done) {
      this.timeout(TIMEOUT)
      chai.request(server)
        .delete(`/phenotype/${name}`)
        .send({
          author: USER_NAME
        })
        .end(async(error, response) => {
          expect(response).to.have.status(500);
          expect(response.text).to.equal(ERROR_MESSAGE);
          done();
        });
    });

    for (const user_name of NEGATIVE_USER_NAMES) {

      it(`Should not delete ${name} phenotype in GitHub`, function(done) {
        this.timeout(TIMEOUT)
        chai.request(server)
          .delete(`/phenotype/${name}`)
          .send({
            author: user_name
          })
          .end(async(error, response) => {
            expect(response).to.have.status(500);
            expect(response.text).to.equal(ERROR_MESSAGE);
            done();
          });
      });
    }
  }

  after(async function() {
    this.timeout(EXTENDED_TIMEOUT);
    
    // Delete all records from the database
    try {
      const response = await chai.request(server)
        .delete('/phenotypes/all');
      expect(response).to.have.status(200);
    } catch (error) {
      console.error('Error deleting records:', error);
      throw error;
    }
  });
});

// 'DELETE' endpoint test block
describe('Suite: Phenoflow DELETE /file endpoint', () => { 
  before(async function() {
    this.timeout(EXTENDED_TIMEOUT);
  
    // Repopulate the database
    try {
      const response = await chai.request(server)
        .post('/initialise');
      expect(response).to.have.status(200);
    } catch (error) {
      console.error('Error repopulating database:', error);
      throw error;
    }
  });

  // Positive cases

  for (const phenotype of STATIC_PHENOTYPES) {
    const name = phenotype.name;

    it(`Should delete LICENSE.md file from ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT)
      chai.request(server)
        .delete(`/file`)
        .send({
          repo: name,
          path: LICENSE_PATH
        })
        .end(async(error, response) => {
          expect(response).to.have.status(200);
          done();
        });
    });

    it(`Should delete README.md file from ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT)
      chai.request(server)
        .delete(`/file`)
        .send({
          repo: name,
          path: README_PATH
        })
        .end(async(error, response) => {
          expect(response).to.have.status(200);
          done();
        });
    });
  }

  // Negative cases

  for (const name of NEGATIVE_PHENOTYPE_NAMES) {

    it(`Should not delete LICENSE.md file from ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT)
      chai.request(server)
        .delete(`/file`)
        .send({
          repo: name,
          path: LICENSE_PATH
        })
        .end(async(error, response) => {
          expect(response).to.have.status(500);
          expect(response.text).to.equal(ERROR_MESSAGE);
          done();
        });
    });

    it(`Should not delete README.md file from ${name} phenotype`, function(done) {
      this.timeout(TIMEOUT)
      chai.request(server)
        .delete(`/file`)
        .send({
          repo: name,
          path: README_PATH
        })
        .end(async(error, response) => {
          expect(response).to.have.status(500);
          expect(response.text).to.equal(ERROR_MESSAGE);
          done();
        });
    });
  }

  after(async function() {
    this.timeout(EXTENDED_TIMEOUT);
    
    // Delete all records from the database
    try {
      const response = await chai.request(server)
        .delete('/phenotypes/all');
      expect(response).to.have.status(200);
    } catch (error) {
      console.error('Error deleting records:', error);
      throw error;
    }
  });
});

// 'DELETE' endpoint test block
describe('Suite: Phenoflow DELETE /files endpoint', () => { 
  before(async function() {
    this.timeout(EXTENDED_TIMEOUT);
  
    // Repopulate the database
    try {
      const response = await chai.request(server)
        .post('/initialise');
      expect(response).to.have.status(200);
    } catch (error) {
      console.error('Error repopulating database:', error);
      throw error;
    }
  });

  // Positive cases

  for (const phenotype of STATIC_PHENOTYPES) {
    const name = phenotype.name;

    it(`Should delete LICENSE.md and README.md file from ${name} phenotype in GitHub`, function(done) {
      this.timeout(TIMEOUT)
      chai.request(server)
        .delete(`/files`)
        .send([{
          repo: name,
          path: LICENSE_PATH
        },{
          repo: name,
          path: README_PATH
        }])
        .end(async(error, response) => {
          expect(response).to.have.status(200);
          done();
        });
    });
  }

  // Negative cases

  for (const name of NEGATIVE_PHENOTYPE_NAMES) {

    it(`Should not delete LICENSE.md and README.md file from ${name} phenotype in GitHub`, function(done) {
      this.timeout(TIMEOUT)
      chai.request(server)
        .delete(`/files`)
        .send([{
          repo: name,
          path: LICENSE_PATH
        },{
          repo: name,
          path: README_PATH
        }])
        .end(async(error, response) => {
          expect(response).to.have.status(500);
          expect(response.text).to.equal(ERROR_MESSAGE);
          done();
        });
    });
  }

  after(async function() {
    this.timeout(EXTENDED_TIMEOUT);
    
    // Delete all records from the database
    try {
      const response = await chai.request(server)
        .delete('/phenotypes/all');
      expect(response).to.have.status(200);
    } catch (error) {
      console.error('Error deleting records:', error);
      throw error;
    }
  });
});
