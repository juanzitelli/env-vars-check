const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const recursiveReadDir = require("recursive-readdir");

const dir = process.argv[2];
const fixMissingVariables = process.argv.includes("--fix");
const skipNodeModules = process.argv.includes("--skipNodeModules");

const ignoreFunc = (file, _stats) => {
  if (path.basename(file) === ".env") return true;
  if (skipNodeModules && file.includes("node_modules")) return true;
  return false;
};

const envVarRegex = /process\.env\.(\w+)|process\.env\[['"](\w+)['"]\]/g;

const findEnvVarsInCode = (filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const envVars = new Map();

  lines.forEach((line, index) => {
    let match;
    while ((match = envVarRegex.exec(line)) !== null) {
      const envVar = match[1] || match[2];
      if (!envVars.has(envVar)) {
        envVars.set(envVar, {
          name: envVar,
          line: index + 1,
          filePath: filePath,
        });
      }
    }
  });

  return Array.from(envVars.values());
};

recursiveReadDir(dir, [ignoreFunc], (err, files) => {
  if (err) throw err;

  const allEnvVars = new Map();
  const tsFiles = files.filter((file) => path.extname(file) === ".ts");

  tsFiles.forEach((file) => {
    const envVarsInFile = findEnvVarsInCode(file);
    envVarsInFile.forEach((envVar) => {
      if (!allEnvVars.has(envVar.name)) {
        allEnvVars.set(envVar.name, envVar);
      }
    });
  });

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
      checkEnvVars(examplePath, envPath, allEnvVars);
      console.log(`Checked .env file: ${envPath}`);
    }
  });

  // Log variables de entorno encontradas en el código pero no en .env.example
  allEnvVars.forEach((envVar) => {
    console.log(
      `⚠️ Environment variable "${envVar.name}" is used in the code but not defined in .env.example`
    );
    console.log(`   File: ${envVar.filePath}:${envVar.line}`);
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

const checkEnvVars = (examplePath, envPath, allEnvVars) => {
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
    // Remove from allEnvVars if it's in .env.example
    allEnvVars.delete(key);
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
