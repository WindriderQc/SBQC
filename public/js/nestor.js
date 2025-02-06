let mouth;

function gotSpeech() 
{
    if(speechRec.resultValue){
    
        let p = createP(speechRec.resultString);
        let d = document.getElementById('speech')
        d.innerHTML = p
        console.log("SpeechRec: ",  p)
        //p.parent(document.getElementById('speech'))
        //createP(speechRec.resultString);
    }
    else {
    let p = createP(speechRec)
    p.parent(document.getElementById('speech'))
    console.log("SpeechRec: ",  speechRec)
    }
}




 
function voiceReady() 
{
   console.log('Speech recognition supported 😊')
   console.log('Voices: ', mouth.voices) 
   mouth.setVoice(1)
   mouth.setRate(1)
   mouth.setPitch(1)

   mouth.speak('How you doinnn?'); // say something

  // mouth.setVoice(6)
// mouth.speak('Caâlisss de tabârnack... Quessé tu fais la encore?'); // say something
}




function setupNestor() {
       // NESTOR
    //let lang = navigator.language || 'fr-FR'   //  'en-US'
    let lang = 'en-US'
    console.log('language: ' + lang)
    let speechRec = new p5.SpeechRec(lang, gotSpeech)
    let continuous = true
    speechRec.start(continuous, false)
    //speechRec.start()

    mouth = new p5.Speech(); // speech synthesis object   
    mouth.onLoad = voiceReady;
}