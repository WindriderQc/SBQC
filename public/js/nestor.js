let speechRec = null
let mouth = null
let isSpeaking = false


function gotSpeech() 
{
    console.log('gotSpeech: ', speechRec)
    if(speechRec.resultValue){
    
        let p = createP(speechRec.resultString);
        let d = document.getElementById('speech')
        //d.innerHTML = p
        p.parent(d)
        console.log("SpeechRec: ",  p)
        //p.parent(document.getElementById('speech'))
        //createP(speechRec.resultString);

        if (speechRec.resultString.includes('hello')) {
            speak('Yo! How are you?');
        }


    }
    else {
    //let p = createP(speechRec)
    //p.parent(document.getElementById('speech'))
    console.log("SpeechRec No ResultValue: ",  speechRec)
    }
}


function speak(text, change=false, voice=1, rate=1, pitch=1, volume=1) {
    isSpeaking = true;

    if(change) {
        mouth.setVoice(voice)
        mouth.setRate(rate)
        mouth.setPitch(pitch)
        mouth.setVolume(volume)
    }

    mouth.speak(text);
    mouth.onEnd = () => {
        isSpeaking = false;
    };
}

 
function voiceReady() 
{
   console.log('Speech recognition supported 😊')
   console.log('Voices: ', mouth.voices) 

   speak('How you doinnn?', true, 6); 

  // mouth.setVoice(6)
// mouth.speak('Caâlisss de tabârnack... Quessé tu fais la encore?'); 
}




function setupNestor() {
    //let lang = navigator.language || 'fr-FR'   //  'en-US'
    let lang = 'en-US'
    console.log('language: ' + lang)
    speechRec = new p5.SpeechRec(lang, gotSpeech)
    let continuous = true
    speechRec.onResult = gotSpeech
    speechRec.start(continuous, false)


    mouth = new p5.Speech(); // speech synthesis object   
    mouth.onLoad = voiceReady;
}