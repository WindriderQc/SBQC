// Constructor
function Forest(num) {

    this.trees = [] // an array for all trees in the forest
    this.treesDNA = []  //  not used, create to store all DNA to fit with kadenze grade process
    this.MAX_TREE = 30

   


    for(var i = 0; i < num; i++)  //  Create a 'num' trees simulation
    { 

        setTimeout((x, y, dna) =>{
            var dna = new DNA() 
            this.treesDNA.push(dna) 
            this.plantTree(random(50,width-50), random(150,height-50), dna) 
        }, random(500, 5) );  // create a tree every .5 to 5.0 sec
    }

  
    // Create a tree on screen and store it in forest array
    this.plantTree = function(x, y, dna) {

        if(this.trees.length <= this.MAX_TREE) {
            console.log('planting')
            var tree = new Tree(dna)
            var pos = createVector(x, y);
            tree.grow(pos, random(-1, -3.5))
            this.trees.push(tree)
        }
      
    }


    // Run the forest
    this.run = function() {
  
        // Cycle through the Trees Array backwards b/c we are deleting
        for (var i = this.trees.length-1; i >= 0; i--) 
        {
            
            var t = this.trees[i]

            t.dynamicTree()  // draw all trees and leaves
                        
            if(t.isDead)
            {
                this.trees.splice(i, 1)  //  Delete dead tree
            
                console.log('dead tree')

                // Perhaps this tree would generate seeds
                var seedDNAs = t.reproduce();
                if (seedDNAs != null) {
                    
                    seedDNAs.forEach(seed => {
                        if(this.trees.length <= this.MAX_TREE)
                            this.plantTree(seed.origin.x, seed.origin.y, seed)
                    });
                    
                }
            }
        


      }
    }
}
