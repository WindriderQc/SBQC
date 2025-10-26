let particles = [];
let particles2 = [];
let particles3 = [];
let walker, walker2, walker3;


function setup()
{
    //  WALKER
    // Get the canvas div dimensions
    let canvasDiv = document.getElementById('canvasDiv');
    let canvasWidth = canvasDiv ? canvasDiv.offsetWidth : 400;
    let canvasHeight = canvasWidth * 0.75; // 4:3 aspect ratio
    
    let canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('canvasDiv');
    
    //create walker
    walker = new Walker()
    walker2 = new Walker()
    walker3 = new Walker()


}



function draw()
{
   // background(239,222,205);
    clear();

    walker.update();
    walker2.update();
    walker3.update();
    for (let i = 0; i < 2; i++) {
        let p = new Particle(walker.pos.x, walker.pos.y);
        particles.push(p);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].show();
        if (particles[i].isFinished()) {
            particles.splice(i, 1);
        }
    }
    for (let i = 0; i < 2; i++) {
        let p2 = new Particle(walker2.pos.x, walker2.pos.y);
        particles2.push(p2);
    }
    for (let i = particles2.length - 1; i >= 0; i--) {
        particles2[i].update();
        particles2[i].show2(walker2.pos.x, walker2.pos.y);
        if (particles2[i].isFinished()) {
            particles2.splice(i, 1);
        }
    }
    for (let i = 0; i < 2; i++) {
        let p3 = new Particle(walker3.pos.x, walker3.pos.y);
        particles3.push(p3);
    }
    for (let i = particles3.length - 1; i >= 0; i--) {
        particles3[i].update();
        particles3[i].show1(walker3.pos.y, walker3.pos.x);
        if (particles3[i].isFinished()) {
            particles3.splice(i, 1);
        }
    }

}

function windowResized() {
    // Resize canvas to fit card
    let canvasDiv = document.getElementById('canvasDiv');
    if (canvasDiv) {
        let canvasWidth = canvasDiv.offsetWidth;
        let canvasHeight = canvasWidth * 0.75; // 4:3 aspect ratio
        resizeCanvas(canvasWidth, canvasHeight);
    }
}