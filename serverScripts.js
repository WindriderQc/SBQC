const { exec } = require('child_process');

PW = process.env.API_PASS

exec('./scripts/sysinfos.sh', (error, stdout, stderr) => {
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