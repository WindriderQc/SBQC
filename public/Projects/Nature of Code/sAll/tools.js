/******************** 
*  Tools
*********************/


// Check if mouse is over defined rectangle
function overRect(x, y, width, height) 
{
    if ((mouseX >= x) && (mouseX <= x+width) && (mouseY >= y) && (mouseY <= y+height)) 
        return true;
    else 
        return false;
}
 
 
// Returns a substring between two substrings. 
// If the beginning of end "tag" is not found, the function returns an empty string.
function giveMeTextBetween(source,  startTag,  endTag) 
{
    // Find the index of the beginning tag
    let startIndex = source.indexOf(startTag);
    // If I don't find anything
    if (startIndex == -1) {
        return "";
    }
    // Move to the end of the beginning tag
    startIndex += startTag.length();

    // Find the index of the end tag
    let endIndex = source.indexOf(endTag, startIndex);
    
    // If I don't find the end tag,
    if (endIndex == -1) {
        return "";
    }
    // Return the text in between
    return source.substring(startIndex, endIndex);
}
 

function recursiveCircle(x,y,d, minD = 10)  //  min diameter is 10 pixels per default
{
    stroke(125);
    noFill();

    ellipse(x,y, d, d);

    if(d > minD) {
      recursiveCircle(x + d/2,y,d/2);
      recursiveCircle(x - d/2,y,d/2);
  }

}
    
 
/*
String url = "http://www.imdb.com/title/tt0058331";
String[] lines = loadStrings(url);
// Get rid of the array in order to search the whole page
String html = join(lines, " ");

// Searching for running time
String start = ""; 

String end = "";
String runningtime = giveMeTextBetween(html, start, end);
println(runningtime);




// *The following code retrieves both the running time and movie poster iamge from IMDb and displays it onscreen.

String runningtime;
PImage poster;

void setup() {
  size(300, 350);
  loadData();
}

void draw() {
  // Display all the stuff I want to display
  background(255);
  image(poster, 10, 10, 164, 250);
  fill(0);
  text("Shaun the Sheep", 10, 300);
  text(runningtime, 10, 320);
}

void loadData() {
  String url = "http://www.imdb.com/title/tt2872750/";

  // Get the raw HTML source into an array of strings (each line is one element in the array).
  // The next step is to turn array into one long string with join().
  String[] lines = loadStrings(url);
  String html = join(lines, "");

  String start = "";
  String end = "";
  runningtime = giveMeTextBetween(html, start, end);Searching for running time.

  start = "";
  // Search for the URL of the poster image.
  String imgUrl = giveMeTextBetween(html, start, end);
  // Now, load that image!
  poster = loadImage(imgUrl);
}

String giveMeTextBetween(String s, String before, String after) {

  // This function returns a substring between two substrings (before and after).
  //  If it can’t find anything it returns an empty string.
  String found = "";

  // Find the index of before
  int start = s.indexOf(before);     
  if (start == -1) {
    return "";                       
  }    

  // Move to the end of the beginning tag
  // and find the index of the "after" String      
  start += before.length();    
  int end = s.indexOf(after, start); 
  if (end == -1) {
    return "";                       
  }

  // Return the text in between
  return s.substring(start, end); 
}
*/

