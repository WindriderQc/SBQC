function Tree() 
{
    this.tree = [];
    this.leaves = [];

    this.BRANCH_LVL = 256  // 1024     //  pourrait etre modifié, plus de branch, plus de leaf, plus de chance de repousser...

    this.growPos = createVector(width/2, height/2)
    this.size_

    this.grow = function(pos, size) 
    {
        this.growPos = pos
        this.size_ = size

        this.BRANCH_LVL = map(this.size_, -1,-3.5, 128, 2048)  // map the branch qty with the size of the tree
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
            this.leaves.push(new Leaf(this.tree[i].end, this.growPos, this.size_)); //  create a leaf if the branch is completed
          }
        }
      }
    

      var dead = 0
      // Update and display all leaves
      for (var j = 0; j < this.leaves.length; j++) 
      { 
          this.leaves[j].update()
          let test = this.leaves[j].display()    //  display 
          if(test) 
              dead++   //  counbt the amount of dead leaves
      }

      
      if(dead < this.leaves.length) 
      { 
          return false  // tree still has some leaves
      }
      else if(this.leaves.length <=1)
      { 
          return false  //  growing tree without leaf
      }
      else
      {
          return true   //  dead tree - return true if all leaves are dead
      }
    }

  
}
  