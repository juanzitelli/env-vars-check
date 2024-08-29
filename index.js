const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const recursiveReadDir = require("recursive-readdir");

const dir = process.argv[2];
const fixMissingVariables = process.argv.includes("--fix");
const skipNodeModules = process.argv.includes("--skipNodeModules");

const ignoreFunc = (file, stats) => {
  // Siempre ignorar archivos .env
  if (path.basename(file) === ".env") return true;

  // Ignorar node_modules si la bandera está activada
  if (skipNodeModules && file.includes("node_modules")) return true;

  return false;
};

recursiveReadDir(dir, [ignoreFunc], (err, files) => {
  if (err) throw err;

  files.forEach((examplePath) => {
    if (path.basename(examplePath) !== ".env.example") return;

    const envPath = path.join(path.dirname(examplePath), ".env");
    if (!fs.existsSync(envPath)) {
      console.log(
        `Missing .env file for .env.example in ${path.relative(
          dir,
          examplePath
        )}`
      );
      if (fixMissingVariables) {
        createEnvFromExample(examplePath, envPath);
      }
    } else {
      checkEnvVars(examplePath, envPath);
      console.log(`Checked .env file: ${envPath}`);
    }
  });
});

const createEnvFromExample = (examplePath, envPath) => {
  try {
    fs.copyFileSync(examplePath, envPath);
    console.log(`Created .env file from .env.example: ${envPath}`);
  } catch (error) {
    console.error(`Error creating .env file: ${error.message}`);
  }
};

const checkEnvVars = (examplePath, envPath) => {
  const exampleVars = dotenv.parse(fs.readFileSync(examplePath));
  const envVars = dotenv.parse(fs.readFileSync(envPath));

  let envContent = fs.readFileSync(envPath, "utf8");
  let missingVars = "";

  Object.keys(exampleVars).forEach((key) => {
    if (!(key in envVars)) {
      const lineNumber = findLineNumber(examplePath, key);
      console.log(
        `The env var ${key} is present on line ${lineNumber} on .env.example file but missing on .env file in ${envPath}`
      );
      if (fixMissingVariables) {
        missingVars += `\n${key}=${exampleVars[key]}`;
      }
    }
  });

  if (fixMissingVariables && missingVars) {
    envContent += missingVars;
    fs.writeFileSync(envPath, envContent);
    console.log(`Missing variables added to .env file: ${envPath}`);
  }
};

const findLineNumber = (file, varName) => {
  const content = fs.readFileSync(file, "utf8").split("\n");
  let line = 1;

  for (const dataLine of content) {
    if (dataLine.split("=")[0] === varName) break;
    line++;
  }

  return line;
};
