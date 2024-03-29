const { exec } = require('child_process');

PW = process.env.API_PASS

exec('./sysinfos.sh', (error, stdout, stderr) => {

  console.log("Launching automated scripts to generate machine infos page\n...")

  if (error) {
    console.error(`error: ${error.message}`);
    return;
  }

  if (stderr) {
    console.error(`stderr: ${stderr}`);
    //return;
  }

  console.log(`stdout:\n${stdout}`);
});