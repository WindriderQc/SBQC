// Constructor
function Tree(dna_) 
{
    this.tree = [];
    this.leaves = [];
    this.dna = dna_;   // DNA

    this.BRANCH_LVL = 256  // 1024     //  pourrait etre modifié, plus de branch, plus de leaf, plus de chance de repousser...
    this.REPRODUCTION_DIST = 4
    this.SEED_TRESHOLD = 93
    this.MAX_SEEDS = 2000

    this.growPos = createVector(width/2, height/2)
    this.size
    this.isDead = false;

    this.grow = function(pos, size) 
    {
        this.growPos = pos
        this.size = size

        this.BRANCH_LVL = map(this.size, -1,-3.5, 64, 1024)  // map the branch qty with the size of the tree
        var b = new Branch(pos, createVector(0, size), 20);
        this.tree.push(b);
    }
   

    this.dynamicTree = function()
    {
     
        // Update and display the recursive trees
        for (var i = 0; i < this.tree.length; i++) {
            // Get the branch, update and draw it
            this.tree[i].update();
            this.tree[i].render();
            
            if (this.tree[i].timeToBranch()) {
                if (this.tree.length < this.BRANCH_LVL) {    
                  this.tree.push(this.tree[i].branch(30)); // Add one going right
                  this.tree.push(this.tree[i].branch(-25)); // Add one going left
                } else {
                // console.log(this.dna)
                  this.leaves.push(new Leaf(this.tree[i].end, this.growPos, this.size, this.dna)); //  create a leaf if the branch is completed
                }
            }
        }
    

      var dead = 0
      // Update and display all leaves
      for (var j = 0; j < this.leaves.length; j++) 
      { 
          this.leaves[j].update()
          var test = this.leaves[j].display()    //  display 
          if(test) 
              dead++   //  counbt the amount of dead leaves
      }

      
      if(dead < this.leaves.length) 
      { 
        this.isDead = false;
          return false  // tree still has some leaves
      }
      else if(this.leaves.length <=1)
      { 
        this.isDead = false;
          return false  //  growing tree without leaf
      }
      else
      {
        this.isDead = true;
          return true   //  dead tree - return true if all leaves are dead
      }
    }



    // If a dying leaf is fit with another close leaf, there is a chance a tree will reproduce
    this.reproduce = function() {

       var l1 = []
       var l2 = []
       var seeds = []

       // Selection
       //  find all leaves that are close enough
        for (var i = 0; i < this.leaves.length; i++) 
        {        
            for (var j = 0; j < this.leaves.length; j++) 
            { 
                var distance = p5.Vector.dist(this.leaves[i].pos, this.leaves[j].pos);
                if(distance <= this.REPRODUCTION_DIST) 
                {
                   l1.push(this.leaves[i]) 
                   l2.push(this.leaves[j])                   
                }
            }
        }

        // find all close leaves couples that are fit to become seed
        for (var i = 0; i < l1.length; i++) 
        {
            var seedScore = this.calcFitness(l1[i], l2[i])

            if( (seedScore >= this.SEED_TRESHOLD/100)   &&  (seeds.length <= this.MAX_SEEDS -1) )
            {
             
                // Child is exact copy of single parent
                var childDNA = this.dna.copy()
                
                childDNA.origin = l1[i].pos
                
                childDNA.mutate(); // Child DNA can mutate
              
                seeds.push(childDNA)
                
            }

        }
        
        //  if we have seeds, return them 
        if(seeds.length>= 1)
        {
          console.log(seeds)
          return seeds
        }
        else {
                  return null;
              }


    }


// check if leaves has enough % chance to become a seed
    this.calcFitness = function(leaf1, leaf2) {
      var score = (leaf1.seed_pct + leaf2.seed_pct) / 2
      return score/100  //  Returns a 0-1 value for reproduction fitness
    }
  
}
  