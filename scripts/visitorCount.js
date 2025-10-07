const fs = require('fs').promises;

let visitorCount = 0
 

async function initCount() {
    try {
        const data = await fs.readFile('visitCounter.txt');
        visitorCount = parseInt(data.toString(), 10) || 0;
        console.log('Visitor count loaded: ', visitorCount);
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log('visitCounter.txt not found. Initializing count to 0.');
            visitorCount = 0;
            await fs.writeFile('visitCounter.txt', '0');
        } else {
            console.error(`Got an error trying to read the file: ${err.message}`);
        }
    }
}
(async function () {  await initCount()  })();



exports.increaseCount = async () =>{
    try {
      visitorCount++
      await fs.writeFile('visitCounter.txt', visitorCount.toString())
      console.log('count', visitorCount)
      return visitorCount
    } catch (error) {
      console.error(`Got an error trying to write to a file: ${error.message}`);
    }
}


exports.getCount = () => {  return visitorCount.toString()  }




/*

exports.readFile = async (filePath) =>{
    try {
        const data = await fs.readFile(filePath);
        console.log(data.toString());
      } catch (error) {
        console.error(`Got an error trying to read the file: ${error.message}`);
      }
}

exports.deleteFile = async (filePath) =>{
  try {
    await fs.unlink(filePath);
    console.log(`Deleted ${filePath}`);
  } catch (error) {
    console.error(`Got an error trying to delete the file: ${error.message}`);
  }
  //  Warning: When you delete the file with the unlink() function, it is not sent to your recycle bin or trash can 
  //         but permanently removed from your filesystem. This action is not reversible, so please be certain that 
  //         you want to remove the file before executing your code. 
}

exports.moveFile = async (source, destination) =>{  
  try {
    await fs.rename(source, destination);
    console.log(`Moved file from ${source} to ${destination}`);
  } catch (error) {
    console.error(`Got an error trying to move the file: ${error.message}`);
  }
  // filename must be included in destination as rename is supported   TODO:  ptete mettre filename comme parametre a la function
}
 

async function openFile() {
  try {
    const csvHeaders = 'name,quantity,price'
    await fs.writeFile('groceries.csv', csvHeaders);
  } catch (error) {
    console.error(`Got an error trying to write to a file: ${error.message}`);
  }
}

async function addGroceryItem(name, quantity, price) {
  try {
    const csvLine = `\n${name},${quantity},${price}`
    await fs.writeFile('groceries.csv', csvLine, { flag: 'a' });
  } catch (error) {
    console.error(`Got an error trying to write to a file: ${error.message}`);
  }
}
*/
/*
(async function () {
    await openFile();
    await addGroceryItem('eggs', 12, 1.50);
    await addGroceryItem('nutella', 1, 4);
  })();
*/
  /*
  use the cat command to display the contents of groceries.csv:

cat groceries.csv
*/