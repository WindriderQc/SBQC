function Leaf(pos, treePos, treeSize, dna) {

    this.pos = pos.copy();
    this.vel = createVector(0, 0);
    this.acc = createVector(0, random(0.05, 0.15));
    this.treePos = treePos 
    this.groundzone = random(-treeSize, treeSize)
   
    this.isDead = false

    this.dna = dna
    var lifeSpan = (this.dna.MAX_LIFE - this.dna.MIN_LIFE) * 0.2 
    this.hangLife =  this.dna.genes.hangLife + random(-lifeSpan, lifeSpan)
    this.groundLife = this.dna.genes.groundLife
    this.aliveColor = this.dna.genes.aliveColor

    //  defines randomess of automn leaves color before they fall
    this.automnize = function(color) {
      var newColor = {r:0, g:0, b:0}   
      newColor.r = this.dna.mutate255(color.r, 1, 255)
      newColor.g = this.dna.mutate255(color.g, 125, 1)
      newColor.b = this.dna.mutate255(color.b, 1, 1) 
     
      return newColor
    }


    this.deadColor = this.automnize(this.aliveColor)

    // set leaf % chance of reproduction
    this.seed_pct = (this.aliveColor.g / 255) * 100 * random(0.0,1.0)
      

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

        fill(this.aliveColor.r, this.aliveColor.g - 1/this.hangLife*25, this.aliveColor.b)  //  growing color
        if(this.hangLife <= 0) // if leaf fall
        {  
          fill(this.deadColor.r, this.deadColor.g, this.deadColor.b) //  automn color
        }

        if(!this.isDead){
          ellipse(this.pos.x, this.pos.y, 4, 4); // paint only if not dead
          return false
        }
        else
        {
          return true
        }  
    }


  


  }