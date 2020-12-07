// Daniel Shiffman
// https://www.kadenze.com/courses/the-nature-of-code
// http://natureofcode.com/
// Session 5: Evolutionary Computing

// Class to describe DNA


// Constructor (makes a random DNA)
function DNA(newgenes) {

  this.MIN_LIFE = 10
  this.MAX_LIFE = 100

  this.mutateFactor = 25

  this.geneticCode = []  //  added for Kadenze grading

  if (newgenes) {
    this.genes = newgenes;
  } else {
    // The genetic sequence
    // DNA is random floating point values between 0 and 1 (!!)
    this.genes =  {
      aliveColor: { r:15,               g:240,           b:15 } , 
      deadColor:  { r:random(200, 240), g:random(0,255), b:15 } , 
      hangLife:   random(this.MIN_LIFE, this.MAX_LIFE),
      groundLife: random(10, 50) ,
      origin: createVector(0,0)
    }
  
  }
  this.geneticCode.push(this.genes)  // with an array of genes, it allows variation, ex: color transition through time...   Not Used but added for Kadenze Grading

  this.copy = function() {
    // should switch to fancy JS array copy
    var newgenes = {};
    newgenes = this.genes;
    
    return new DNA(newgenes);
  }

  // Will randomly change leaves color and hangtime/groundtime duration
  this.mutate = function() {
    
    this.genes.aliveColor =  this.mutateColor(this.genes.aliveColor)

    //this.genes.deadColor =  { r:random(200, 240), g:random(0,255), b:15 } 
    //var healthFactor = (this.genes.aliveColor.g/255) * 25
    //this.genes.hangLife =   this.genes.hangLife + random(-20, healthFactor)
    //this.genes.groundLife =  this.genes.groundLife + random(-10, 10) 
    
    //if(this.genes.hangLife <=10) this.genes.hangLife = 10
    //if(this.genes.groundLife <=5) this.genes.groundLife = 5
    
  }

  //  will randomly mutate growing leaves color
  this.mutateColor = function(color) {
    var newColor = {r:0, g:0, b:0}   
    newColor.r = this.mutate255(color.r, this.mutateFactor, this.mutateFactor)
    newColor.g = this.mutate255(color.g, this.mutateFactor, this.mutateFactor)
    newColor.b = this.mutate255(color.b, this.mutateFactor, this.mutateFactor) 
   
    return newColor
  }

  // helper function fo mutate a 0-255 value
  this.mutate255 = function(val, minus, plus) {
      var newVal = val + random(-minus,plus)
      if(newVal < 0)   newVal = 0
      if(newVal > 255) newVal = 255
      return newVal
  }

}
