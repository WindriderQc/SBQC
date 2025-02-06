//  PARTICLE
class Particle {
    constructor(startX, startY) {
      this.x = startX;
      this.y = startY;
      this.vx = random(-1,1);
      this.vy = random(-1,3);
      this.d = random(15, 35);
      this.acc = 0.1;
      this.alpha = 255;
    }
    update() {
      this.vy = this.vy - this.acc;
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= 4;
    }
    isFinished() {
      return this.alpha < 30;
    }
    show() {
      noStroke();
      fill(255, random(80,190), 0,this.alpha);
      circle(this.x, this.y, this.d)
    }
    show1(colorX, colorY){
      noStroke();
      fill(colorX, random(80,190), colorY, this.alpha);
      circle(this.x, this.y, this.d)
    }
    show2(colorX, colorY){
      noStroke();
      fill(random(80,190), colorX, colorY, this.alpha);
      circle(this.x, this.y, this.d)
    }
  }