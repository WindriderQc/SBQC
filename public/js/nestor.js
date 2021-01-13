


let speechRec 

let continuous = true

function setup()
{
   let lang = navigator.language || 'fr-FR'   //  'en-US'
   //let lang = 'en-US'
   console.log('language: ' + lang)
   speechRec = new p5.SpeechRec(lang, gotSpeech)
   speechRec.start(continuous, false)
   console.log(speechRec)


 

}
  function gotSpeech() {
      if(speechRec.resultValue){
        let p = createP(speechRec.resultString);
        p.parent(document.getElementById('speech'))
    }
    else console.log(speechRec)
   }

const mouth = new p5.Speech(); // speech synthesis object   
mouth.onLoad = voiceReady;
  
function voiceReady() {
   console.log('Speech recognition supported 😊')
   console.log(mouth.voices) 
   mouth.setVoice(1)
   mouth.setRate(1)
   mouth.setPitch(1)

   mouth.speak('How you doin baby?'); // say something

  // mouth.setVoice(6)
// mouth.speak('Caâlisss de tabârnack... Quessé tu fais la encore?'); // say something
}

