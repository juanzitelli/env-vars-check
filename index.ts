#!/usr/bin/env node

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import recursiveReadDir from "recursive-readdir";

interface EnvVar {
  name: string;
  line: number;
  filePath: string;
}

interface EnvVarMap {
  [key: string]: EnvVar;
}

const dir: string = process.argv[2] ?? "";
const fixMissingVariables: boolean = process.argv.includes("--fix");
const skipNodeModules: boolean = process.argv.includes("--skipNodeModules");

const ignoreFunc = (file: string, stats: fs.Stats): boolean => {
  if (path.basename(file) === ".env") return true;
  if (skipNodeModules && file.includes("node_modules")) return true;
  return false;
};

const envVarRegex: RegExp =
  /process\.env\.(\w+)|process\.env\[['"](\w+)['"]\]/g;

const findEnvVarsInCode = (filePath: string): EnvVar[] => {
  const content: string = fs.readFileSync(filePath, "utf8");
  const lines: string[] = content.split("\n");
  const envVars: Map<string, EnvVar> = new Map();

  lines.forEach((line: string, index: number) => {
    let match: RegExpExecArray | null;
    while ((match = envVarRegex.exec(line)) !== null) {
      const envVar: string = match[1] || match[2] || "";
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

recursiveReadDir(dir, [ignoreFunc], (err: Error | null, files: string[]) => {
  if (err) throw err;

  const allEnvVars: EnvVarMap = {};
  const tsFiles: string[] = files.filter(
    (file) => path.extname(file) === ".ts"
  );

  tsFiles.forEach((file: string) => {
    const envVarsInFile: EnvVar[] = findEnvVarsInCode(file);
    envVarsInFile.forEach((envVar: EnvVar) => {
      if (!(envVar.name in allEnvVars)) {
        allEnvVars[envVar.name] = envVar;
      }
    });
  });

  files.forEach((examplePath: string) => {
    if (path.basename(examplePath) !== ".env.example") return;

    const envPath: string = path.join(path.dirname(examplePath), ".env");
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

  
  Object.values(allEnvVars).forEach((envVar: EnvVar) => {
    console.log(
      `⚠️ "${envVar.name}" is used in the code but missing in .env.example`
    );
    console.log(`   File: ${envVar.filePath}:${envVar.line}`);
  });
});

const createEnvFromExample = (examplePath: string, envPath: string): void => {
  try {
    const exampleContent: string = fs.readFileSync(examplePath, "utf8");
    const lines: string[] = exampleContent.split("\n");

    const envVariables: string[] = lines
      .filter((line) => line.trim() && !line.startsWith("#")) 
      .map((line) => {
        const [key, ...valueParts] = line.split("=");
        const value = valueParts.join("=").trim(); 
        return `${key?.trim()}=${value}`; 
      })
      .sort(); 

    
    fs.writeFileSync(envPath, envVariables.join("\n"));
    console.log(`Created .env file from .env.example: ${envPath}`);
  } catch (error) {
    console.error(`Error creating .env file: ${(error as Error).message}`);
  }
};

const checkEnvVars = (
  examplePath: string,
  envPath: string,
  allEnvVars: EnvVarMap
): void => {
  const exampleVars: dotenv.DotenvParseOutput = dotenv.parse(
    fs.readFileSync(examplePath)
  );
  const envVars: dotenv.DotenvParseOutput = dotenv.parse(
    fs.readFileSync(envPath)
  );

  let envContent: string = fs.readFileSync(envPath, "utf8");
  let missingVars: string = "";

  Object.keys(exampleVars).forEach((key: string) => {
    if (!(key in envVars)) {
      const lineNumber: number = findLineNumber(examplePath, key);
      console.log(
        `The env var ${key} is present on line ${lineNumber} on .env.example file but missing on .env file in ${envPath}`
      );
      if (fixMissingVariables) {
        missingVars += `\n${key}=${exampleVars[key]}`;
      }
    }
    
    delete allEnvVars[key];
  });

  if (fixMissingVariables && missingVars) {
    envContent += missingVars;
    fs.writeFileSync(envPath, envContent);
    console.log(`Missing variables added to .env file: ${envPath}`);
    console.log(`\nUpdated .env file content:\n${envContent}`);
  }
};

const findLineNumber = (file: string, varName: string): number => {
  const content: string[] = fs.readFileSync(file, "utf8").split("\n");
  let line: number = 1;

  for (const dataLine of content) {
    if (dataLine.split("=")[0] === varName) break;
    line++;
  }

  return line;
};
