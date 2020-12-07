class ColorPick {
    constructor() {
        this.pointColor = color('black')
    }

    // will actualize the color a
    updateRender(showIndicator=false, indicatorSize=15)
    {
        // lets get the image from canvas
        let canvasImage = get()

        //get the color at the mouse position
        let newColor = canvasImage.get(mouseX, mouseY);     // pixel color can be set the same way

        this.pointColor = newColor
        /*  this will invert colors of an image
        for(int y = 0; y < butterflyImage.height; y++){
        for(int x = 0; x < butterflyImage.width; x++){
        color in = butterflyImage.get(x, y);
        color out = color(255-red(in), 255-green(in), 255-blue(in));
        butterflyImage.set(x, y, out);
        }
        }
        */

        if(showIndicator) 
        { 
            fill(this.pointColor)  //change the fill to color at mouse pos
            rect(mouseX, mouseY, indicatorSize, indicatorSize) //draw a rectangle with that color
        }   
        return this.pointColor
    }


}