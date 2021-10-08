function Leaf(pos, treePos, treeSize) {

    this.pos = pos.copy();
    this.vel = createVector(0, 0);
    this.acc = createVector(0, random(0.05, 0.15));
    this.treePos = treePos 
    this.groundzone = random(-treeSize, treeSize)
   
    this.isDead = false

    this.hangLife = random(10, 200)
    this.groundLife = random(10, 80)
    
    this.update = function() 
    {
      
      if(this.hangLife <= 0) // if leaf fall
      {  
        if(this.pos.y >= (this.treePos.y + this.groundzone)) // if leaf reach ground
        {
          this.vel.y = 0;
          this.acc.y = 0;
          this.groundLife--              //  aging on the ground
          if(this.groundLife < 1) {
            this.isDead = true;
          }
        }
        else{
          this.vel.add(this.acc);
          this.pos.add(this.vel);
        }
      }
      else this.hangLife--  // aging in the tree
    }

    // will return false until leaf is dead
    this.display = function() 
    {
      noStroke();
      //fill(50, 100);
      fill(15, 240, 15)
      if(this.hangLife <= 0) // if leaf fall
      {  
        fill(random(200, 240), random(0,255), 15)
      }

      if(!this.isDead){
        ellipse(this.pos.x, this.pos.y, 4, 4); 
        //console.log( "leaf alive")
        return false
      }
      else
      {
        //console.log( "leaf dead")
        return true
      }  
    }

  
  }