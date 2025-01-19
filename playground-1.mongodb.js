// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use('SBQC');

// Search for documents in the current collection.
db.getCollection('boot')
  .find(
    {
      host: "Developpement Mode"
    },
    {
      _id: 0, // exclude _id
      host: 1, // include host
      content: 1 // include content
    }
  )
  .sort({
    host: 1 // ascending
  });