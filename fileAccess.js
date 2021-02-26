const fs = require('fs').promises;

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
  /*  Warning: When you delete the file with the unlink() function, it is not sent to your recycle bin or trash can 
           but permanently removed from your filesystem. This action is not reversible, so please be certain that 
           you want to remove the file before executing your code. */
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






const Tools = {

  getParamValue: (paramName) =>{
          var url = window.location.search.substring(1) //get rid of "?" in querystring
          var qArray = url.split('&') //get key-value pairs
          for (var i = 0; i < qArray.length; i++) 
          {
              var pArr = qArray[i].split('=') //split key and value
              if (pArr[0] == paramName) 
                  return pArr[1]; //return value
          }
          return ""
      },

      
  sleep: (ms) =>{
          return new Promise(resolve => setTimeout(resolve, ms))
      },
 
    
  fillForm: (formId, data) => {
          const { elements } = document.getElementById(formId)

          for (const [ key, value ] of Object.entries(data) ) 
          {
              const field = elements.namedItem(key)
              field && (field.value = value)
          }
      },


  scale: (num, in_min, in_max, out_min, out_max) =>{         
          return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min
      },
  






  randomScalingFactor: () => {
          return Math.round(Math.random() * 100)
      },


  randomData: () => {
          return [
              Math.round(Math.random() * 100),
              Math.round(Math.random() * 100),
              Math.round(Math.random() * 100),
              Math.round(Math.random() * 100)
              ]
      },


  randomValue : (data) => {
          return Math.max.apply(null, data) * Math.random()
      }

}Je ne peux